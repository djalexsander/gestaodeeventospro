
-- Drop the recursive policy
DROP POLICY IF EXISTS "Company users can view company profiles" ON public.profiles;

-- Create a security definer function to get company_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Company users can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- Also fix the user_roles policy that has same issue
DROP POLICY IF EXISTS "Company admins can view company user roles" ON public.user_roles;

CREATE POLICY "Company admins can view company user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT p.id FROM profiles p
    WHERE p.company_id = public.get_user_company_id(auth.uid())
  )
);
