
-- 1. Add owner access to canil_* tables (UNION with workspaces owner check)
DROP POLICY IF EXISTS "Members can view animais in their workspace" ON public.canil_animais;
DROP POLICY IF EXISTS "Members can insert animais in their workspace" ON public.canil_animais;
DROP POLICY IF EXISTS "Members can update animais in their workspace" ON public.canil_animais;
DROP POLICY IF EXISTS "Members can delete animais in their workspace" ON public.canil_animais;

CREATE POLICY "canil_animais_select" ON public.canil_animais FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "canil_animais_insert" ON public.canil_animais FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_animais_update" ON public.canil_animais FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_animais_delete" ON public.canil_animais FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_animais.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can view ninhadas in their workspace" ON public.canil_ninhadas;
DROP POLICY IF EXISTS "Members can insert ninhadas in their workspace" ON public.canil_ninhadas;
DROP POLICY IF EXISTS "Members can update ninhadas in their workspace" ON public.canil_ninhadas;
DROP POLICY IF EXISTS "Members can delete ninhadas in their workspace" ON public.canil_ninhadas;

CREATE POLICY "canil_ninhadas_select" ON public.canil_ninhadas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "canil_ninhadas_insert" ON public.canil_ninhadas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_ninhadas_update" ON public.canil_ninhadas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_ninhadas_delete" ON public.canil_ninhadas FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_ninhadas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can view clinico in their workspace" ON public.canil_registos_clinicos;
DROP POLICY IF EXISTS "Members can insert clinico in their workspace" ON public.canil_registos_clinicos;
DROP POLICY IF EXISTS "Members can update clinico in their workspace" ON public.canil_registos_clinicos;
DROP POLICY IF EXISTS "Members can delete clinico in their workspace" ON public.canil_registos_clinicos;

CREATE POLICY "canil_clinico_select" ON public.canil_registos_clinicos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "canil_clinico_insert" ON public.canil_registos_clinicos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_clinico_update" ON public.canil_registos_clinicos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_clinico_delete" ON public.canil_registos_clinicos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_registos_clinicos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can view reservas in their workspace" ON public.canil_reservas;
DROP POLICY IF EXISTS "Members can insert reservas in their workspace" ON public.canil_reservas;
DROP POLICY IF EXISTS "Members can update reservas in their workspace" ON public.canil_reservas;
DROP POLICY IF EXISTS "Members can delete reservas in their workspace" ON public.canil_reservas;

CREATE POLICY "canil_reservas_select" ON public.canil_reservas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "canil_reservas_insert" ON public.canil_reservas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_reservas_update" ON public.canil_reservas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "canil_reservas_delete" ON public.canil_reservas FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = canil_reservas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

-- 2. Add role check to dev_*, alertas, juridico_* write policies
DROP POLICY IF EXISTS "Members can insert projectos in their workspace" ON public.dev_projectos;
DROP POLICY IF EXISTS "Members can update projectos in their workspace" ON public.dev_projectos;
DROP POLICY IF EXISTS "Members can delete projectos in their workspace" ON public.dev_projectos;
CREATE POLICY "dev_projectos_insert" ON public.dev_projectos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_projectos_update" ON public.dev_projectos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_projectos_delete" ON public.dev_projectos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can insert issues in their workspace" ON public.dev_issues;
DROP POLICY IF EXISTS "Members can update issues in their workspace" ON public.dev_issues;
DROP POLICY IF EXISTS "Members can delete issues in their workspace" ON public.dev_issues;
CREATE POLICY "dev_issues_insert" ON public.dev_issues FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_issues_update" ON public.dev_issues FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_issues_delete" ON public.dev_issues FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can insert adrs in their workspace" ON public.dev_adrs;
DROP POLICY IF EXISTS "Members can update adrs in their workspace" ON public.dev_adrs;
DROP POLICY IF EXISTS "Members can delete adrs in their workspace" ON public.dev_adrs;
CREATE POLICY "dev_adrs_insert" ON public.dev_adrs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_adrs_update" ON public.dev_adrs FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "dev_adrs_delete" ON public.dev_adrs FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "Members can insert alertas in their workspace" ON public.alertas;
DROP POLICY IF EXISTS "Members can update alertas in their workspace" ON public.alertas;
DROP POLICY IF EXISTS "Members can delete alertas in their workspace" ON public.alertas;
CREATE POLICY "alertas_insert" ON public.alertas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "alertas_update" ON public.alertas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "alertas_delete" ON public.alertas FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

-- juridico_* split ALL policy into role-aware policies
DROP POLICY IF EXISTS "workspace_members_access" ON public.juridico_processos;
CREATE POLICY "juridico_processos_select" ON public.juridico_processos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_processos.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "juridico_processos_insert" ON public.juridico_processos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_processos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_processos_update" ON public.juridico_processos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_processos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_processos_delete" ON public.juridico_processos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_processos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "workspace_members_access" ON public.juridico_documentos;
CREATE POLICY "juridico_documentos_select" ON public.juridico_documentos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_documentos.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "juridico_documentos_insert" ON public.juridico_documentos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_documentos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_documentos_update" ON public.juridico_documentos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_documentos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_documentos_delete" ON public.juridico_documentos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_documentos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "workspace_members_access" ON public.juridico_partes;
CREATE POLICY "juridico_partes_select" ON public.juridico_partes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_partes.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "juridico_partes_insert" ON public.juridico_partes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_partes.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_partes_update" ON public.juridico_partes FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_partes.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_partes_delete" ON public.juridico_partes FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_partes.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

DROP POLICY IF EXISTS "workspace_members_access" ON public.juridico_prazos;
CREATE POLICY "juridico_prazos_select" ON public.juridico_prazos FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_prazos.workspace_id AND wm.user_id = auth.uid())
);
CREATE POLICY "juridico_prazos_insert" ON public.juridico_prazos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_prazos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_prazos_update" ON public.juridico_prazos FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_prazos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);
CREATE POLICY "juridico_prazos_delete" ON public.juridico_prazos FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = juridico_prazos.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('editor','admin'))
);

-- 3. Restrict SELECT on user_oauth_credentials to writes only; reads must use the safe view
DROP POLICY IF EXISTS "own_write" ON public.user_oauth_credentials;
CREATE POLICY "own_insert" ON public.user_oauth_credentials FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON public.user_oauth_credentials FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON public.user_oauth_credentials FOR DELETE TO authenticated
USING (user_id = auth.uid());
-- Intentionally no SELECT policy: client must use user_oauth_credentials_safe view

-- Grant authenticated SELECT on the safe view (it's security_invoker, so RLS still applies on base — keep a SELECT policy scoped via the view definition)
-- Re-add a column-restricted SELECT policy used only by the safe view via security_invoker = false
-- Simpler: ensure safe view is security_invoker=false (definer) so it can read regardless
ALTER VIEW public.user_oauth_credentials_safe SET (security_invoker = false);
GRANT SELECT ON public.user_oauth_credentials_safe TO authenticated;
-- Make sure underlying table grant restricts what view-owner exposes; view masks client_secret.

-- 4. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_nonces() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_disciplina_user_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_processo_user_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_issue_processo_user_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
-- create_application_with_factos must remain callable by authenticated users (RPC from client)
REVOKE EXECUTE ON FUNCTION public.create_application_with_factos(uuid,uuid,uuid,text,text,uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_application_with_factos(uuid,uuid,uuid,text,text,uuid[]) TO authenticated;
