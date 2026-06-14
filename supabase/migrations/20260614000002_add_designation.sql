-- Add designation (job title) to profiles.
-- Read: covered by existing "Users can view permitted profiles" SELECT policy.
-- Write: covered by existing "Super admin can update any profile" UPDATE policy.
ALTER TABLE public.profiles ADD COLUMN designation text;
