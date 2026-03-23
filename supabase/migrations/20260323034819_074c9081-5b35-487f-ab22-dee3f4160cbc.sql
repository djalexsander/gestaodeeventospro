
-- Tabela de planos configuráveis
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('trial', 'monthly', 'lifetime')),
  duration_days integer, -- null para vitalício
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de assinaturas das empresas
CREATE TABLE public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- null para vitalício
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view plans" ON public.plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin master can manage plans" ON public.plans
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- RLS para company_subscriptions
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view subscriptions" ON public.company_subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin master can manage subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

-- Planos padrão
INSERT INTO public.plans (name, type, duration_days, price, description) VALUES
  ('Free Trial', 'trial', 7, 0, 'Teste gratuito por 7 dias'),
  ('Plano Mensal', 'monthly', 30, 99.90, 'Acesso completo por 30 dias'),
  ('Plano Vitalício', 'lifetime', NULL, 999.90, 'Acesso vitalício sem expiração');
