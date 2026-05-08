
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

CREATE OR REPLACE FUNCTION public.change_subscription_plan_dev(_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _plan NOT IN ('free', 'basic', 'premium', 'pro') THEN
    RAISE EXCEPTION 'Invalid plan: %', _plan;
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
