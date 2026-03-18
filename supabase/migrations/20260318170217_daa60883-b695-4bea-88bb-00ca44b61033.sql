
CREATE TABLE public.event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, staff_member_id)
);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event staff are publicly accessible" ON public.event_staff FOR SELECT TO public USING (true);
CREATE POLICY "Event staff can be inserted" ON public.event_staff FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Event staff can be deleted" ON public.event_staff FOR DELETE TO public USING (true);
