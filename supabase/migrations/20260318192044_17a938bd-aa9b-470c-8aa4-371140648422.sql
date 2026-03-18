
-- System settings table for platform identity
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'Gestão de Eventos Pro',
  platform_logo_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.system_settings (platform_name) VALUES ('Gestão de Eventos Pro');

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view settings"
ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin master can update settings"
ON public.system_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Add email and phone to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
