-- 1. New profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_tryons_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_shopping_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

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

-- 4. Make closet-items bucket PRIVATE and add per-user folder RLS
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
USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Closet items: users can delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'closet-items' AND auth.uid()::text = (storage.foldername(name))[1]);