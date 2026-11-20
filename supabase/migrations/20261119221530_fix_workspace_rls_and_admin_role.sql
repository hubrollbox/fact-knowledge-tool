-- Rebuild workspace authorization functions safely even when an earlier
-- migration created the same signatures with different input parameter names.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('workspaces', 'workspace_members')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.workspace_can_manage_members(uuid, uuid);
DROP FUNCTION IF EXISTS public.workspace_can_read(uuid, uuid);
DROP FUNCTION IF EXISTS public.workspace_can_write(uuid, uuid);
DROP FUNCTION IF EXISTS public.workspace_role_for_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.workspace_is_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.workspace_owner_id(uuid);

CREATE FUNCTION public.workspace_is_owner(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = _ws AND w.user_id = _uid);
$$;
CREATE FUNCTION public.workspace_owner_id(_ws uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.user_id FROM public.workspaces w WHERE w.id = _ws;
$$;
CREATE FUNCTION public.workspace_role_for_user(_ws uuid, _uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.workspace_is_owner(_ws, _uid) THEN 'owner'
    ELSE (SELECT wm.role FROM public.workspace_members wm WHERE wm.workspace_id = _ws AND wm.user_id = _uid LIMIT 1) END;
$$;
CREATE FUNCTION public.workspace_can_read(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.workspace_role_for_user(_ws, _uid) IS NOT NULL; $$;
CREATE FUNCTION public.workspace_can_write(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.workspace_role_for_user(_ws, _uid) IN ('owner', 'admin', 'editor'); $$;
CREATE FUNCTION public.workspace_can_manage_members(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.workspace_is_owner(_ws, _uid); $$;

REVOKE ALL ON FUNCTION public.workspace_is_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_owner_id(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_role_for_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_can_read(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_can_write(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workspace_can_manage_members(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_is_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_owner_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role_for_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_write(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_manage_members(uuid, uuid) TO authenticated;

ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));

CREATE POLICY workspaces_select_authorized ON public.workspaces FOR SELECT TO authenticated USING (public.workspace_can_read(id, auth.uid()));
CREATE POLICY workspaces_insert_owner ON public.workspaces FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY workspaces_update_owner ON public.workspaces FOR UPDATE TO authenticated USING (public.workspace_can_write(id, auth.uid())) WITH CHECK (user_id = public.workspace_owner_id(id));
CREATE POLICY workspaces_delete_owner ON public.workspaces FOR DELETE TO authenticated USING (public.workspace_is_owner(id, auth.uid()));

CREATE POLICY workspace_members_select_authorized ON public.workspace_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.workspace_can_manage_members(workspace_id, auth.uid()));
CREATE POLICY workspace_members_insert_owner ON public.workspace_members FOR INSERT TO authenticated WITH CHECK (public.workspace_can_manage_members(workspace_id, auth.uid()));
CREATE POLICY workspace_members_update_owner ON public.workspace_members FOR UPDATE TO authenticated USING (public.workspace_can_manage_members(workspace_id, auth.uid())) WITH CHECK (public.workspace_can_manage_members(workspace_id, auth.uid()));
CREATE POLICY workspace_members_delete_owner ON public.workspace_members FOR DELETE TO authenticated USING (public.workspace_can_manage_members(workspace_id, auth.uid()));
