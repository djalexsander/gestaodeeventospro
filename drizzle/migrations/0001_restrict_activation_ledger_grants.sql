REVOKE ALL ON TABLE public.account_activations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_activations TO service_role;
REVOKE ALL ON FUNCTION public.prevent_activation_reopening() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_activation_reopening() TO service_role;