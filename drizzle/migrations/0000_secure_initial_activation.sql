CREATE TABLE public.account_activations (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 company_id uuid NOT NULL REFERENCES public.companies(id),
 state text NOT NULL CHECK (state IN ('legacy_locked','pending','activated')),
 token_hash text UNIQUE,
 expires_at timestamptz,
 activated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (state <> 'pending' OR (token_hash IS NOT NULL AND expires_at IS NOT NULL))
);
GRANT ALL ON public.account_activations TO service_role;
ALTER TABLE public.account_activations ENABLE ROW LEVEL SECURITY;
INSERT INTO public.account_activations (user_id,company_id,state,activated_at)
 SELECT id,company_id,'legacy_locked',now() FROM public.profiles WHERE company_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.prevent_activation_reopening() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.state IN ('legacy_locked','activated') THEN
   RAISE EXCEPTION 'Activation is permanently closed';
 END IF;
 IF NEW.user_id <> OLD.user_id OR NEW.company_id <> OLD.company_id THEN
   RAISE EXCEPTION 'Activation identity is immutable';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER activation_no_reopening BEFORE UPDATE ON public.account_activations FOR EACH ROW EXECUTE FUNCTION public.prevent_activation_reopening();
CREATE OR REPLACE FUNCTION public.claim_initial_activation(_token_hash text)
 RETURNS TABLE(user_id uuid) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE public.account_activations a SET state='activated', activated_at=now(), token_hash=NULL
 WHERE a.state='pending' AND a.token_hash=_token_hash AND a.expires_at>now()
 RETURNING a.user_id;
$$;
REVOKE ALL ON FUNCTION public.claim_initial_activation(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_initial_activation(text) TO service_role;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,name,email,company_id)
 VALUES (NEW.id,COALESCE(NEW.raw_user_meta_data->>'name',''),NEW.email,NULL);
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'user');
 RETURN NEW;
END;
$$;