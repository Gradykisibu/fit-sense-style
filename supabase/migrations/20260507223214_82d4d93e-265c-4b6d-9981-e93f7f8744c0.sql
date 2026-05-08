-- 1. New profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_tryons_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_shopping_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_supported_country_check
  CHECK (country IS NULL OR upper(country) IN ('ZA', 'US', 'GB', 'CA', 'FR')) NOT VALID;

-- 2. Replace reset function to cover all 4 counters
CREATE OR REPLACE FUNCTION public.reset_usage_if_needed(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    monthly_analyses_used = 0,
    monthly_chats_used = 0,
    monthly_tryons_used = 0,
    monthly_shopping_used = 0,
    usage_reset_date = (date_trunc('month', now()) + interval '1 month'),
    updated_at = now()
  WHERE id = _user_id
    AND (usage_reset_date IS NULL OR now() > usage_reset_date);
END;
$$;

-- 3. New increment RPCs (mirror increment_analyses pattern)
CREATE OR REPLACE FUNCTION public.increment_tryons(_user_id uuid)
RETURNS TABLE(monthly_tryons_used integer, usage_reset_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    monthly_tryons_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 1
      ELSE monthly_tryons_used + 1
    END,
    usage_reset_date = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN (date_trunc('month', now()) + interval '1 month')
      ELSE usage_reset_date
    END,
    updated_at = now()
  WHERE id = _user_id
  RETURNING profiles.monthly_tryons_used, profiles.usage_reset_date
  INTO monthly_tryons_used, usage_reset_date;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_shopping(_user_id uuid)
RETURNS TABLE(monthly_shopping_used integer, usage_reset_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    monthly_shopping_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 1
      ELSE monthly_shopping_used + 1
    END,
    usage_reset_date = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN (date_trunc('month', now()) + interval '1 month')
      ELSE usage_reset_date
    END,
    updated_at = now()
  WHERE id = _user_id
  RETURNING profiles.monthly_shopping_used, profiles.usage_reset_date
  INTO monthly_shopping_used, usage_reset_date;
  RETURN NEXT;
END;
$$;

-- 4. Lock profile edits to safe user-editable fields only
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, phone, country, avatar_url) ON public.profiles TO authenticated;

CREATE POLICY "Users can update editable profile fields via RPC"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_profile_safe(
  _name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _country text DEFAULT NULL,
  _avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _country IS NOT NULL AND upper(_country) NOT IN ('ZA', 'US', 'GB', 'CA', 'FR') THEN
    RAISE EXCEPTION 'Unsupported country: %', _country;
  END IF;

  UPDATE public.profiles
  SET
    name = COALESCE(_name, name),
    phone = COALESCE(_phone, phone),
    country = COALESCE(upper(_country), country),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile_safe(text, text, text, text) TO authenticated;

-- TEMPORARY: self-service plan switching for non-production testing only.
-- Remove this function before production and replace it with a payment/webhook flow.
CREATE OR REPLACE FUNCTION public.change_subscription_plan_dev(_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _plan NOT IN ('free', 'basic', 'premium', 'pro') THEN
    RAISE EXCEPTION 'Unsupported subscription plan: %', _plan;
  END IF;

  UPDATE public.profiles
  SET
    subscription_plan = _plan,
    subscription_start_date = now(),
    monthly_analyses_used = 0,
    monthly_chats_used = 0,
    monthly_tryons_used = 0,
    monthly_shopping_used = 0,
    usage_reset_date = (date_trunc('month', now()) + interval '1 month'),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_subscription_plan_dev(text) TO authenticated;

-- 5. Make closet-items bucket PRIVATE and add per-user folder RLS
UPDATE storage.buckets SET public = false WHERE id = 'closet-items';

DROP POLICY IF EXISTS "Closet items: users can read own" ON storage.objects;
DROP POLICY IF EXISTS "Closet items: users can upload own" ON storage.objects;
DROP POLICY IF EXISTS "Closet items: users can update own" ON storage.objects;
DROP POLICY IF EXISTS "Closet items: users can delete own" ON storage.objects;

CREATE POLICY "Closet items: users can read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Closet items: users can upload own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Closet items: users can update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Closet items: users can delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can insert their own closet items" ON public.closet_items;
DROP POLICY IF EXISTS "Users can update their own closet items" ON public.closet_items;

CREATE POLICY "Users can insert their own closet items"
ON public.closet_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND image_url LIKE auth.uid()::text || '/%');

CREATE POLICY "Users can update their own closet items"
ON public.closet_items FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND image_url LIKE auth.uid()::text || '/%');
