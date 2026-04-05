
-- ============================================
-- 1. FIX RLS POLICIES: public → authenticated
-- ============================================

-- clientes
DROP POLICY IF EXISTS "own" ON public.clientes;
CREATE POLICY "own" ON public.clientes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- dossiers
DROP POLICY IF EXISTS "own" ON public.dossiers;
CREATE POLICY "own" ON public.dossiers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- disciplinas
DROP POLICY IF EXISTS "own" ON public.disciplinas;
CREATE POLICY "own" ON public.disciplinas FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- countdown_events
DROP POLICY IF EXISTS "own" ON public.countdown_events;
CREATE POLICY "own" ON public.countdown_events FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- oauth_tokens
DROP POLICY IF EXISTS "own" ON public.oauth_tokens;
CREATE POLICY "own" ON public.oauth_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_services
DROP POLICY IF EXISTS "own" ON public.user_services;
CREATE POLICY "own" ON public.user_services FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- actions
DROP POLICY IF EXISTS "via_dossier" ON public.actions;
CREATE POLICY "via_dossier" ON public.actions FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- applications
DROP POLICY IF EXISTS "via_dossier" ON public.applications;
CREATE POLICY "via_dossier" ON public.applications FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- application_factos
DROP POLICY IF EXISTS "via_application" ON public.application_factos;
CREATE POLICY "via_application" ON public.application_factos FOR ALL TO authenticated
  USING (application_id IN (SELECT a.id FROM applications a WHERE a.dossier_id IN (SELECT d.id FROM dossiers d WHERE d.user_id = auth.uid())));

-- conclusoes
DROP POLICY IF EXISTS "via_issue" ON public.conclusoes;
CREATE POLICY "via_issue" ON public.conclusoes FOR ALL TO authenticated
  USING (issue_id IN (SELECT i.id FROM issues i WHERE i.dossier_id IN (SELECT d.id FROM dossiers d WHERE d.user_id = auth.uid())));

-- disciplina_processos
DROP POLICY IF EXISTS "via_disciplina" ON public.disciplina_processos;
CREATE POLICY "via_disciplina" ON public.disciplina_processos FOR ALL TO authenticated
  USING (disciplina_id IN (SELECT id FROM disciplinas WHERE user_id = auth.uid()));

-- documentos
DROP POLICY IF EXISTS "via_dossier" ON public.documentos;
CREATE POLICY "via_dossier" ON public.documentos FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- factos
DROP POLICY IF EXISTS "via_dossier" ON public.factos;
CREATE POLICY "via_dossier" ON public.factos FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- issues
DROP POLICY IF EXISTS "via_dossier" ON public.issues;
CREATE POLICY "via_dossier" ON public.issues FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- rules
DROP POLICY IF EXISTS "via_dossier" ON public.rules;
CREATE POLICY "via_dossier" ON public.rules FOR ALL TO authenticated
  USING (dossier_id IN (SELECT id FROM dossiers WHERE user_id = auth.uid()));

-- topicos
DROP POLICY IF EXISTS "via_disciplina" ON public.topicos;
CREATE POLICY "via_disciplina" ON public.topicos FOR ALL TO authenticated
  USING (disciplina_id IN (SELECT id FROM disciplinas WHERE user_id = auth.uid()));

-- ============================================
-- 2. SECURITY DEFINER VIEW → SECURITY INVOKER
-- ============================================

DROP VIEW IF EXISTS public.user_oauth_credentials_safe;
CREATE VIEW public.user_oauth_credentials_safe
  WITH (security_invoker = true)
AS
  SELECT id, user_id, provider, client_id,
         '••••••••'::text AS client_secret,
         created_at, updated_at
  FROM public.user_oauth_credentials
  WHERE user_id = auth.uid();

-- ============================================
-- 3. OAUTH STATE NONCES (CSRF Protection)
-- ============================================

CREATE TABLE public.oauth_state_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  service text NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  service_email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_state_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_insert" ON public.oauth_state_nonces
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_select" ON public.oauth_state_nonces
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role needs full access for callback verification
-- (handled via service_role_key which bypasses RLS)

-- Auto-cleanup expired nonces
CREATE OR REPLACE FUNCTION public.cleanup_expired_nonces()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.oauth_state_nonces WHERE expires_at < now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_nonces
  AFTER INSERT ON public.oauth_state_nonces
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_nonces();
