-- Atomic increment for analyses with auto-reset
CREATE OR REPLACE FUNCTION public.increment_analyses(_user_id uuid)
RETURNS TABLE(monthly_analyses_used integer, usage_reset_date timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    monthly_analyses_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 1
      ELSE monthly_analyses_used + 1
    END,
    monthly_chats_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 0
      ELSE monthly_chats_used
    END,
    usage_reset_date = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN (date_trunc('month', now()) + interval '1 month')
      ELSE usage_reset_date
    END,
    updated_at = now()
  WHERE id = _user_id
  RETURNING profiles.monthly_analyses_used, profiles.usage_reset_date
  INTO monthly_analyses_used, usage_reset_date;
  RETURN NEXT;
END;
$$;

-- Atomic increment for chats with auto-reset
CREATE OR REPLACE FUNCTION public.increment_chats(_user_id uuid)
RETURNS TABLE(monthly_chats_used integer, usage_reset_date timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    monthly_chats_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 1
      ELSE monthly_chats_used + 1
    END,
    monthly_analyses_used = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN 0
      ELSE monthly_analyses_used
    END,
    usage_reset_date = CASE
      WHEN usage_reset_date IS NULL OR now() > usage_reset_date THEN (date_trunc('month', now()) + interval '1 month')
      ELSE usage_reset_date
    END,
    updated_at = now()
  WHERE id = _user_id
  RETURNING profiles.monthly_chats_used, profiles.usage_reset_date
  INTO monthly_chats_used, usage_reset_date;
  RETURN NEXT;
END;
$$;

-- Reset-only helper (called before limit check if needed)
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
    usage_reset_date = (date_trunc('month', now()) + interval '1 month'),
    updated_at = now()
  WHERE id = _user_id
    AND (usage_reset_date IS NULL OR now() > usage_reset_date);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_analyses(uuid) FROM public;
REVOKE ALL ON FUNCTION public.increment_chats(uuid) FROM public;
REVOKE ALL ON FUNCTION public.reset_usage_if_needed(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_analyses(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_chats(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_usage_if_needed(uuid) TO authenticated, service_role;