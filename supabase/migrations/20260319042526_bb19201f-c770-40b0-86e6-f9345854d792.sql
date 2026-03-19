CREATE POLICY "Company admins can update company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'company_admin'::public.app_role)
  AND company_id = public.get_user_company_id(auth.uid())
  AND NOT public.has_role(id, 'admin'::public.app_role)
  AND NOT public.has_role(id, 'admin_master'::public.app_role)
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND NOT public.has_role(id, 'admin'::public.app_role)
  AND NOT public.has_role(id, 'admin_master'::public.app_role)
);

CREATE POLICY "Company admins can update company user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'company_admin'::public.app_role)
  AND user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.company_id = public.get_user_company_id(auth.uid())
  )
  AND role IN ('company_admin'::public.app_role, 'user'::public.app_role)
)
WITH CHECK (
  user_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.company_id = public.get_user_company_id(auth.uid())
  )
  AND role IN ('company_admin'::public.app_role, 'user'::public.app_role)
);