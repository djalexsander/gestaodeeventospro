CREATE TABLE public.pix_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_type text NOT NULL DEFAULT 'celular',
  pix_key text NOT NULL DEFAULT '',
  receiver_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  bank text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view pix settings" ON public.pix_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin master can manage pix settings" ON public.pix_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

INSERT INTO public.pix_settings (key_type, pix_key, receiver_name, city, bank) VALUES ('celular', '', '', '', '');