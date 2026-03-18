-- Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS for companies
CREATE POLICY "Companies viewable by authenticated" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin master can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master can update companies" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));
CREATE POLICY "Admin master can delete companies" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin_master'));

-- Add company_id to all entity tables
ALTER TABLE public.events ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.artists ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.technical_riders ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.cities ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.staff_members ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);
CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
CREATE POLICY "Authenticated can upload company logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');

-- Update trigger for new roles and company_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'company_id', '')::uuid
  );

  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin_master');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', '')::app_role, 'user'));
  END IF;

  RETURN NEW;
END;
$$;

-- Realtime for companies
ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;