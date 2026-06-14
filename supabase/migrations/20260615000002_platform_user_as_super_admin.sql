-- Platform Users (org_id IS NULL) are implicitly super_admin within any org
-- they own. Update the helper functions so RPCs recognise this without
-- requiring a separate role promotion in the profiles table.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
  -- Platform User is always admin within their own orgs
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND org_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  -- Platform User is always super_admin within their own orgs
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND org_id IS NULL
  );
$$;
