-- Multi-org support: organizations table, org_id on all data tables,
-- org-scoped RLS, and Platform User identity (profiles.org_id IS NULL).
--
-- Identity tiers:
--   Platform User  — personal email, profiles.org_id IS NULL, sees org picker
--   Org Member     — email is username@orgslug.logbook, profiles.org_id set

-- ============================================================
-- 1. Organizations table
-- ============================================================

CREATE TABLE public.organizations (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name     text NOT NULL,
  slug     text NOT NULL UNIQUE
             CHECK (slug ~ '^[a-z0-9]+$' AND char_length(slug) BETWEEN 2 AND 50),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organizations_owner_idx ON public.organizations(owner_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Platform User (owner) can see their own orgs
CREATE POLICY "Owner can view own organizations"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

REVOKE ALL ON public.organizations FROM anon;
GRANT SELECT ON public.organizations TO authenticated;

DROP TRIGGER IF EXISTS handle_organizations_updated_at ON public.organizations;
CREATE TRIGGER handle_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- 2. Add org_id to profiles (NULL = Platform User)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX profiles_org_idx ON public.profiles(org_id);

-- Org Members can see their own org (must come after profiles.org_id exists)
CREATE POLICY "Member can view own organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND org_id = organizations.id
    )
  );

-- ============================================================
-- 3. Add org_id to all data tables
-- ============================================================

ALTER TABLE public.work_sessions
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.hourly_updates
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.user_status
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.day_wraps
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.activity_feed
  ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Update handle_new_user() to set org_id from metadata
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, org_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'org_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. is_platform_user() helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_user() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_platform_user() FROM anon;

-- ============================================================
-- 6. Update can_view_user() to be org-scoped
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_view_user(target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Always see yourself
    target = auth.uid()

    OR (
      -- Platform User (Owner): can see all members of orgs they own
      EXISTS (
        SELECT 1
        FROM profiles caller
        JOIN organizations o ON o.owner_id = auth.uid()
        JOIN profiles tgt ON tgt.id = target AND tgt.org_id = o.id
        WHERE caller.id = auth.uid() AND caller.org_id IS NULL
      )
    )

    OR (
      -- Org Member: must share the same org, then role-based rules apply
      EXISTS (
        SELECT 1
        FROM profiles caller
        JOIN profiles tgt ON tgt.id = target AND tgt.org_id = caller.org_id
        WHERE caller.id = auth.uid()
          AND caller.org_id IS NOT NULL
          AND (
            -- Super admin sees everyone in the org
            caller.role = 'super_admin'

            -- Admin sees assigned/unassigned employees within the org
            OR (
              caller.role = 'admin'
              AND tgt.role = 'employee'
              AND (tgt.assigned_admin_id = auth.uid() OR tgt.assigned_admin_id IS NULL)
            )

            -- Admin sees super_admin who opted in (same org only)
            OR (
              caller.role = 'admin'
              AND tgt.role = 'super_admin'
              AND tgt.show_work_to_admins = true
            )
          )
      )
    )
$$;

-- ============================================================
-- 7. Fix activity_feed policy (was: all authenticated users)
-- ============================================================

DROP POLICY IF EXISTS "View activity feed" ON public.activity_feed;

CREATE POLICY "View org activity feed"
  ON public.activity_feed FOR SELECT
  USING (
    -- Org Member sees their own org's feed
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())

    OR (
      -- Platform User sees feed for any org they own
      (SELECT org_id FROM profiles WHERE id = auth.uid()) IS NULL
      AND EXISTS (
        SELECT 1 FROM organizations
        WHERE owner_id = auth.uid() AND id = activity_feed.org_id
      )
    )
  );

-- ============================================================
-- 8. create_organization() RPC — Platform Users only
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_organization(p_name text, p_slug text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF NOT public.is_platform_user() THEN
    RAISE EXCEPTION 'Only platform users can create organizations';
  END IF;

  IF p_slug !~ '^[a-z0-9]+$' OR char_length(p_slug) < 2 OR char_length(p_slug) > 50 THEN
    RAISE EXCEPTION 'Slug must be 2–50 lowercase alphanumeric characters';
  END IF;

  IF char_length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  INSERT INTO organizations (name, slug, owner_id)
  VALUES (trim(p_name), p_slug, auth.uid())
  RETURNING id INTO v_org_id;

  RETURN json_build_object('id', v_org_id, 'name', trim(p_name), 'slug', p_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_organization(text, text) FROM anon;

-- ============================================================
-- 9. Backfill: create Atomnik org, set Karan as owner, backfill rows
-- ============================================================

DO $$
DECLARE
  v_owner_id uuid;
  v_org_id   uuid;
BEGIN
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'karansingh.fr@gmail.com';

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'Owner email karansingh.fr@gmail.com not found — skipping backfill';
    RETURN;
  END IF;

  INSERT INTO organizations (name, slug, owner_id)
  VALUES ('Atomnik', 'atomnik', v_owner_id)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_org_id;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'atomnik';
  END IF;

  -- All profiles except the Platform User owner get Atomnik's org_id
  UPDATE profiles SET org_id = v_org_id
  WHERE org_id IS NULL AND id != v_owner_id;

  UPDATE work_sessions  SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE hourly_updates SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE tasks          SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE day_wraps      SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE activity_feed  SET org_id = v_org_id WHERE org_id IS NULL;

  UPDATE user_status us
  SET org_id = v_org_id
  FROM profiles p
  WHERE us.user_id = p.id AND us.org_id IS NULL;

  RAISE NOTICE 'Backfill complete — Atomnik org_id = %', v_org_id;
END;
$$;
