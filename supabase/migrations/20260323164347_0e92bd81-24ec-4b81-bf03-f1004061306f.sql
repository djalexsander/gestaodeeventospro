
-- Drop old permissive public policies on staff_members
DROP POLICY IF EXISTS "Staff members are publicly accessible" ON public.staff_members;
DROP POLICY IF EXISTS "Staff members can be inserted" ON public.staff_members;
DROP POLICY IF EXISTS "Staff members can be updated" ON public.staff_members;
DROP POLICY IF EXISTS "Staff members can be deleted" ON public.staff_members;

-- New RLS: users can only see staff from their own company
CREATE POLICY "Users can view own company staff"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users can insert own company staff"
  ON public.staff_members FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users can update own company staff"
  ON public.staff_members FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Users can delete own company staff"
  ON public.staff_members FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

-- Also tighten cities, artists, technical_riders, events, event_staff
-- CITIES
DROP POLICY IF EXISTS "Cities are publicly accessible" ON public.cities;
DROP POLICY IF EXISTS "Cities can be inserted" ON public.cities;
DROP POLICY IF EXISTS "Cities can be updated" ON public.cities;
DROP POLICY IF EXISTS "Cities can be deleted" ON public.cities;

CREATE POLICY "Users can view own company cities"
  ON public.cities FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can insert own company cities"
  ON public.cities FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can update own company cities"
  ON public.cities FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can delete own company cities"
  ON public.cities FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

-- ARTISTS
DROP POLICY IF EXISTS "Artists are publicly accessible" ON public.artists;
DROP POLICY IF EXISTS "Artists can be inserted" ON public.artists;
DROP POLICY IF EXISTS "Artists can be updated" ON public.artists;
DROP POLICY IF EXISTS "Artists can be deleted" ON public.artists;

CREATE POLICY "Users can view own company artists"
  ON public.artists FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can insert own company artists"
  ON public.artists FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can update own company artists"
  ON public.artists FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can delete own company artists"
  ON public.artists FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

-- TECHNICAL_RIDERS
DROP POLICY IF EXISTS "Riders are publicly accessible" ON public.technical_riders;
DROP POLICY IF EXISTS "Riders can be inserted" ON public.technical_riders;
DROP POLICY IF EXISTS "Riders can be updated" ON public.technical_riders;
DROP POLICY IF EXISTS "Riders can be deleted" ON public.technical_riders;

CREATE POLICY "Users can view own company riders"
  ON public.technical_riders FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can insert own company riders"
  ON public.technical_riders FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can update own company riders"
  ON public.technical_riders FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can delete own company riders"
  ON public.technical_riders FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

-- EVENTS
DROP POLICY IF EXISTS "Events are publicly accessible" ON public.events;
DROP POLICY IF EXISTS "Events can be inserted" ON public.events;
DROP POLICY IF EXISTS "Events can be updated" ON public.events;
DROP POLICY IF EXISTS "Events can be deleted" ON public.events;

CREATE POLICY "Users can view own company events"
  ON public.events FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can insert own company events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can update own company events"
  ON public.events FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "Users can delete own company events"
  ON public.events FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

-- EVENT_STAFF
DROP POLICY IF EXISTS "Event staff are publicly accessible" ON public.event_staff;
DROP POLICY IF EXISTS "Event staff can be inserted" ON public.event_staff;
DROP POLICY IF EXISTS "Event staff can be deleted" ON public.event_staff;

CREATE POLICY "Users can view own company event staff"
  ON public.event_staff FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE company_id = get_user_company_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_master'::app_role)
  );
CREATE POLICY "Users can insert own company event staff"
  ON public.event_staff FOR INSERT TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM public.events WHERE company_id = get_user_company_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_master'::app_role)
  );
CREATE POLICY "Users can delete own company event staff"
  ON public.event_staff FOR DELETE TO authenticated
  USING (
    event_id IN (SELECT id FROM public.events WHERE company_id = get_user_company_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_master'::app_role)
  );
