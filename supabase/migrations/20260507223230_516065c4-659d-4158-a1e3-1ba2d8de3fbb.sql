REVOKE EXECUTE ON FUNCTION public.reset_usage_if_needed(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_analyses(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_chats(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_tryons(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_shopping(uuid) FROM anon, authenticated, public;