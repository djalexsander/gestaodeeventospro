-- Company admins and users can view profiles from same company
CREATE POLICY "Company users can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- Company admins can view user_roles for users in their company
CREATE POLICY "Company admins can view company user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.company_id = (SELECT p2.company_id FROM public.profiles p2 WHERE p2.id = auth.uid())
  )
);

-- Admin master can view all roles
CREATE POLICY "Admin master can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Admin master can manage all roles
CREATE POLICY "Admin master can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Admin master can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));