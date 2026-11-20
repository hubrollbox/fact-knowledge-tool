-- Issue #65: harden FKT Lex workspace authorization, Storage paths and referential integrity.
-- Keep the legacy "documentos" layout (<user>/<dossier>/<file>) separate from Lex
-- (<uploader>/<workspace>/<process>/<file>).

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- SECURITY DEFINER helpers only derive the identity from auth.uid().
-- Callers cannot ask these helpers to evaluate another user's permissions.
CREATE OR REPLACE FUNCTION private.workspace_is_owner(_ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _ws AND w.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION private.workspace_owner_id(_ws uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT w.user_id
  FROM public.workspaces w
  WHERE w.id = _ws
    AND (
      w.user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = (SELECT auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.workspace_role_for_current_user(_ws uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = _ws AND w.user_id = (SELECT auth.uid())
    ) THEN 'owner'
    ELSE (
      SELECT wm.role
      FROM public.workspace_members wm
      WHERE wm.workspace_id = _ws AND wm.user_id = (SELECT auth.uid())
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_read(_ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT private.workspace_role_for_current_user(_ws) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_write(_ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT private.workspace_role_for_current_user(_ws) IN ('owner', 'admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_manage_members(_ws uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT private.workspace_is_owner(_ws);
$$;

REVOKE ALL ON FUNCTION private.workspace_is_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_owner_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_role_for_current_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_can_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_can_write(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.workspace_can_manage_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_owner_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_role_for_current_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_write(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_manage_members(uuid) TO authenticated;

-- Retain the public RPC signatures for compatibility, but make them invoker
-- wrappers and ignore caller-supplied user IDs. They can only report the
-- current caller's own permissions.
CREATE OR REPLACE FUNCTION public.workspace_is_owner(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_is_owner(_ws); $$;

CREATE OR REPLACE FUNCTION public.workspace_owner_id(_ws uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_owner_id(_ws); $$;

CREATE OR REPLACE FUNCTION public.workspace_role_for_user(_ws uuid, _uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_role_for_current_user(_ws); $$;

CREATE OR REPLACE FUNCTION public.workspace_can_read(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_can_read(_ws); $$;

CREATE OR REPLACE FUNCTION public.workspace_can_write(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_can_write(_ws); $$;

CREATE OR REPLACE FUNCTION public.workspace_can_manage_members(_ws uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$ SELECT private.workspace_can_manage_members(_ws); $$;

GRANT EXECUTE ON FUNCTION public.workspace_is_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_owner_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role_for_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_read(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_write(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_can_manage_members(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.workspace_role_for_user(uuid, uuid) IS
  'Compatibility RPC. The user argument is ignored; only the current authenticated user is evaluated.';
COMMENT ON FUNCTION public.workspace_can_read(uuid, uuid) IS
  'Compatibility RPC. The user argument is ignored; only the current authenticated user is evaluated.';
COMMENT ON FUNCTION public.workspace_can_write(uuid, uuid) IS
  'Compatibility RPC. The user argument is ignored; only the current authenticated user is evaluated.';

-- Rebuild policies using the non-exposed private helpers.
DROP POLICY IF EXISTS workspaces_select_authorized ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert_owner ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update_owner ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete_owner ON public.workspaces;
CREATE POLICY workspaces_select_authorized ON public.workspaces
  FOR SELECT TO authenticated USING (private.workspace_can_read(id));
CREATE POLICY workspaces_insert_owner ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY workspaces_update_owner ON public.workspaces
  FOR UPDATE TO authenticated
  USING (private.workspace_can_write(id))
  WITH CHECK (user_id = private.workspace_owner_id(id));
CREATE POLICY workspaces_delete_owner ON public.workspaces
  FOR DELETE TO authenticated USING (private.workspace_is_owner(id));

DROP POLICY IF EXISTS workspace_members_select_authorized ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_insert_owner ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_update_owner ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_delete_owner ON public.workspace_members;
CREATE POLICY workspace_members_select_authorized ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR private.workspace_can_manage_members(workspace_id));
CREATE POLICY workspace_members_insert_owner ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (private.workspace_can_manage_members(workspace_id));
CREATE POLICY workspace_members_update_owner ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (private.workspace_can_manage_members(workspace_id))
  WITH CHECK (private.workspace_can_manage_members(workspace_id));
CREATE POLICY workspace_members_delete_owner ON public.workspace_members
  FOR DELETE TO authenticated USING (private.workspace_can_manage_members(workspace_id));

-- Ensure a child row cannot point to a process in another workspace.
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.juridico_processos'::regclass
      AND conname = 'juridico_processos_id_workspace_unique'
  ) THEN
    ALTER TABLE public.juridico_processos
      ADD CONSTRAINT juridico_processos_id_workspace_unique UNIQUE (id, workspace_id);
  END IF;
END $;

ALTER TABLE public.juridico_partes
  DROP CONSTRAINT IF EXISTS juridico_partes_processo_id_fkey;
ALTER TABLE public.juridico_partes
  ADD CONSTRAINT juridico_partes_process_workspace_fk
  FOREIGN KEY (processo_id, workspace_id)
  REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE;

ALTER TABLE public.juridico_documentos
  DROP CONSTRAINT IF EXISTS juridico_documentos_processo_id_fkey;
ALTER TABLE public.juridico_documentos
  ADD CONSTRAINT juridico_documentos_process_workspace_fk
  FOREIGN KEY (processo_id, workspace_id)
  REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE;

ALTER TABLE public.juridico_prazos
  DROP CONSTRAINT IF EXISTS juridico_prazos_processo_id_fkey;
ALTER TABLE public.juridico_prazos
  ADD CONSTRAINT juridico_prazos_process_workspace_fk
  FOREIGN KEY (processo_id, workspace_id)
  REFERENCES public.juridico_processos(id, workspace_id) ON DELETE CASCADE;

-- The database stores a Storage object path, never a public or signed URL.
ALTER TABLE public.juridico_documentos
  ADD CONSTRAINT juridico_documentos_storage_path_only
  CHECK (ficheiro_url IS NULL OR ficheiro_url !~* '^https?://');

-- Replace legacy broad per-user Storage policies. Legacy FKT dossier files use
-- exactly two folders; FKT Lex uses exactly three and is governed separately.
DROP POLICY IF EXISTS "Users can access own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS user_uploads ON storage.objects;

CREATE POLICY documentos_legacy_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 2
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY documentos_legacy_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 2
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY documentos_legacy_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 2
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 2
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
CREATE POLICY documentos_legacy_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 2
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS fkt_lex_documents_workspace_select ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_insert ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_update ON storage.objects;
DROP POLICY IF EXISTS fkt_lex_documents_workspace_delete ON storage.objects;

CREATE POLICY fkt_lex_documents_workspace_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 3
    AND private.workspace_can_read(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.juridico_processos p
      WHERE p.id = ((storage.foldername(name))[3])::uuid
        AND p.workspace_id = ((storage.foldername(name))[2])::uuid
    )
  );
CREATE POLICY fkt_lex_documents_workspace_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 3
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND private.workspace_can_write(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.juridico_processos p
      WHERE p.id = ((storage.foldername(name))[3])::uuid
        AND p.workspace_id = ((storage.foldername(name))[2])::uuid
    )
  );
CREATE POLICY fkt_lex_documents_workspace_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 3
    AND private.workspace_can_write(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.juridico_processos p
      WHERE p.id = ((storage.foldername(name))[3])::uuid
        AND p.workspace_id = ((storage.foldername(name))[2])::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 3
    AND private.workspace_can_write(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.juridico_processos p
      WHERE p.id = ((storage.foldername(name))[3])::uuid
        AND p.workspace_id = ((storage.foldername(name))[2])::uuid
    )
  );
CREATE POLICY fkt_lex_documents_workspace_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND cardinality(storage.foldername(name)) = 3
    AND private.workspace_can_write(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.juridico_processos p
      WHERE p.id = ((storage.foldername(name))[3])::uuid
        AND p.workspace_id = ((storage.foldername(name))[2])::uuid
    )
  );

-- Apply the private helpers to the four existing Lex tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['juridico_processos','juridico_partes','juridico_documentos','juridico_prazos']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.workspace_can_read(workspace_id))',
      t || '_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.workspace_can_write(workspace_id))',
      t || '_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.workspace_can_write(workspace_id)) WITH CHECK (private.workspace_can_write(workspace_id))',
      t || '_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.workspace_can_write(workspace_id))',
      t || '_delete', t
    );
  END LOOP;
END $$;
