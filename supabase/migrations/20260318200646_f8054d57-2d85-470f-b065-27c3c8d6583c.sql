
-- Allow admin_master to view all profiles
CREATE POLICY "Admin master can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Allow admin_master to update all profiles
CREATE POLICY "Admin master can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Allow admin_master to delete profiles
CREATE POLICY "Admin master can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role));
