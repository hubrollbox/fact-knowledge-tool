
-- 1. Rename processo_id → dossier_id in all child tables
ALTER TABLE public.factos RENAME COLUMN processo_id TO dossier_id;
ALTER TABLE public.issues RENAME COLUMN processo_id TO dossier_id;
ALTER TABLE public.documentos RENAME COLUMN processo_id TO dossier_id;
ALTER TABLE public.rules RENAME COLUMN processo_id TO dossier_id;
ALTER TABLE public.applications RENAME COLUMN processo_id TO dossier_id;

-- 2. Rename foreign key constraints for consistency
ALTER TABLE public.dossiers RENAME CONSTRAINT processos_cliente_id_fkey TO dossiers_cliente_id_fkey;
ALTER TABLE public.factos RENAME CONSTRAINT factos_processo_id_fkey TO factos_dossier_id_fkey;
ALTER TABLE public.issues RENAME CONSTRAINT issues_processo_id_fkey TO issues_dossier_id_fkey;
ALTER TABLE public.documentos RENAME CONSTRAINT documentos_processo_id_fkey TO documentos_dossier_id_fkey;
ALTER TABLE public.rules RENAME CONSTRAINT rules_processo_id_fkey TO rules_dossier_id_fkey;
ALTER TABLE public.applications RENAME CONSTRAINT applications_processo_id_fkey TO applications_dossier_id_fkey;
ALTER TABLE public.disciplina_processos RENAME CONSTRAINT disciplina_processos_processo_id_fkey TO disciplina_processos_dossier_id_fkey;

-- Also rename the column in disciplina_processos
ALTER TABLE public.disciplina_processos RENAME COLUMN processo_id TO dossier_id;

-- 3. Recreate RLS policies to use new column names

-- factos
DROP POLICY IF EXISTS "via_processo" ON public.factos;
CREATE POLICY "via_dossier" ON public.factos FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- issues
DROP POLICY IF EXISTS "via_processo" ON public.issues;
CREATE POLICY "via_dossier" ON public.issues FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- documentos
DROP POLICY IF EXISTS "via_processo" ON public.documentos;
CREATE POLICY "via_dossier" ON public.documentos FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- rules
DROP POLICY IF EXISTS "via_processo" ON public.rules;
CREATE POLICY "via_dossier" ON public.rules FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- applications
DROP POLICY IF EXISTS "via_processo" ON public.applications;
CREATE POLICY "via_dossier" ON public.applications FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- application_factos (update to use new column name in subquery)
DROP POLICY IF EXISTS "via_application" ON public.application_factos;
CREATE POLICY "via_application" ON public.application_factos FOR ALL USING (
  application_id IN (
    SELECT id FROM public.applications
    WHERE dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
  )
);

-- disciplina_processos
DROP POLICY IF EXISTS "via_disciplina" ON public.disciplina_processos;
CREATE POLICY "via_disciplina" ON public.disciplina_processos FOR ALL USING (
  disciplina_id IN (SELECT id FROM public.disciplinas WHERE user_id = auth.uid())
);

-- 4. Update helper functions to use new column name
CREATE OR REPLACE FUNCTION public.get_processo_user_id(_processo_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id FROM public.dossiers WHERE id = _processo_id; $$;

CREATE OR REPLACE FUNCTION public.get_issue_processo_user_id(_issue_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.user_id FROM public.issues i
  JOIN public.dossiers d ON d.id = i.dossier_id
  WHERE i.id = _issue_id;
$$;

-- 5. Atomic RPC for creating application with factos
CREATE OR REPLACE FUNCTION public.create_application_with_factos(
  _dossier_id uuid,
  _issue_id uuid,
  _rule_id uuid,
  _argumento text,
  _tipo text DEFAULT 'pro',
  _facto_ids uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app_id uuid;
  _fid uuid;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.dossiers WHERE id = _dossier_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.applications (dossier_id, issue_id, rule_id, argumento, tipo)
  VALUES (_dossier_id, _issue_id, _rule_id, _argumento, _tipo)
  RETURNING id INTO _app_id;

  FOREACH _fid IN ARRAY _facto_ids LOOP
    INSERT INTO public.application_factos (application_id, facto_id)
    VALUES (_app_id, _fid);
  END LOOP;

  RETURN _app_id;
END;
$$;
