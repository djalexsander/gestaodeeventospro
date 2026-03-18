
CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('equipe', 'freelancer')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff members are publicly accessible" ON public.staff_members FOR SELECT TO public USING (true);
CREATE POLICY "Staff members can be inserted" ON public.staff_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff members can be updated" ON public.staff_members FOR UPDATE TO public USING (true);
CREATE POLICY "Staff members can be deleted" ON public.staff_members FOR DELETE TO public USING (true);

CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
