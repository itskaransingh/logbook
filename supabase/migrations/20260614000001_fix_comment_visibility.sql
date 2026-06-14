-- Fix: admins can always see super_admin profiles so comment author names
-- display correctly. Previously, can_view_user() returned false for super_admin
-- targets unless show_work_to_admins = true, causing author names to appear as
-- "Unknown" on task comments. Work data (tasks, sessions) remains gated by the
-- show_work_to_admins flag via can_view_user().

CREATE POLICY "Admins can view super admin profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin() AND role = 'super_admin'
  );
