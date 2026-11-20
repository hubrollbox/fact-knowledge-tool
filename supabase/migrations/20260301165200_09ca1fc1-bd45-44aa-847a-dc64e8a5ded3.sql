-- This migration documents the existing RLS policies for version control consistency.
-- All these policies already exist in the database but were not captured in migration files.

-- Ensure RLS is enabled on all tables (idempotent)
ALTER TABLE IF EXISTS public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.factos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.application_factos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conclusoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disciplina_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.topicos ENABLE ROW LEVEL SECURITY;

-- Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.get_processo_user_id(_processo_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.processos WHERE id = _processo_id;
$$;

CREATE OR REPLACE FUNCTION public.get_disciplina_user_id(_disciplina_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.disciplinas WHERE id = _disciplina_id;
$$;

CREATE OR REPLACE FUNCTION public.get_issue_processo_user_id(_issue_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id FROM public.issues i
  JOIN public.processos p ON p.id = i.processo_id
  WHERE i.id = _issue_id;
$$;

-- Recreate policies using DROP IF EXISTS + CREATE pattern for idempotency

-- processos
DROP POLICY IF EXISTS "own" ON public.processos;
CREATE POLICY "own" ON public.processos FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- clientes
DROP POLICY IF EXISTS "own" ON public.clientes;
CREATE POLICY "own" ON public.clientes FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- disciplinas
DROP POLICY IF EXISTS "own" ON public.disciplinas;
CREATE POLICY "own" ON public.disciplinas FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- documentos
DROP POLICY IF EXISTS "via_processo" ON public.documentos;
CREATE POLICY "via_processo" ON public.documentos FOR ALL
  USING (processo_id IN (SELECT id FROM processos WHERE user_id = auth.uid()));

-- factos
DROP POLICY IF EXISTS "via_processo" ON public.factos;
CREATE POLICY "via_processo" ON public.factos FOR ALL
  USING (processo_id IN (SELECT id FROM processos WHERE user_id = auth.uid()));

-- issues
DROP POLICY IF EXISTS "via_processo" ON public.issues;
CREATE POLICY "via_processo" ON public.issues FOR ALL
  USING (processo_id IN (SELECT id FROM processos WHERE user_id = auth.uid()));

-- rules
DROP POLICY IF EXISTS "via_processo" ON public.rules;
CREATE POLICY "via_processo" ON public.rules FOR ALL
  USING (processo_id IN (SELECT id FROM processos WHERE user_id = auth.uid()));

-- applications
DROP POLICY IF EXISTS "via_processo" ON public.applications;
CREATE POLICY "via_processo" ON public.applications FOR ALL
  USING (processo_id IN (SELECT id FROM processos WHERE user_id = auth.uid()));

-- application_factos
DROP POLICY IF EXISTS "via_application" ON public.application_factos;
CREATE POLICY "via_application" ON public.application_factos FOR ALL
  USING (application_id IN (
    SELECT id FROM applications WHERE processo_id IN (
      SELECT id FROM processos WHERE user_id = auth.uid()
    )
  ));

-- conclusoes
DROP POLICY IF EXISTS "via_issue" ON public.conclusoes;
CREATE POLICY "via_issue" ON public.conclusoes FOR ALL
  USING (issue_id IN (
    SELECT id FROM issues WHERE processo_id IN (
      SELECT id FROM processos WHERE user_id = auth.uid()
    )
  ));

-- disciplina_processos
DROP POLICY IF EXISTS "via_disciplina" ON public.disciplina_processos;
CREATE POLICY "via_disciplina" ON public.disciplina_processos FOR ALL
  USING (disciplina_id IN (SELECT id FROM disciplinas WHERE user_id = auth.uid()));

-- topicos
DROP POLICY IF EXISTS "via_disciplina" ON public.topicos;
CREATE POLICY "via_disciplina" ON public.topicos FOR ALL
  USING (disciplina_id IN (SELECT id FROM disciplinas WHERE user_id = auth.uid()));