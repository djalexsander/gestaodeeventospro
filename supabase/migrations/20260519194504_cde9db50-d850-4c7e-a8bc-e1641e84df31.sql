ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS contratante_nome text,
  ADD COLUMN IF NOT EXISTS contratante_cidade text,
  ADD COLUMN IF NOT EXISTS contratante_telefone text;
ALTER TABLE public.events DROP COLUMN IF EXISTS realizado_com;