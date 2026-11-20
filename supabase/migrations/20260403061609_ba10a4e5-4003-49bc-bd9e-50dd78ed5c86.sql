
-- Rename processos table to dossiers
ALTER TABLE public.processos RENAME TO dossiers;

-- Update RLS policy on dossiers
DROP POLICY IF EXISTS "own" ON public.dossiers;
CREATE POLICY "own" ON public.dossiers FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Update helper function
CREATE OR REPLACE FUNCTION public.get_processo_user_id(_processo_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT user_id FROM public.dossiers WHERE id = _processo_id;
$$;

-- Update RLS policies on child tables that reference processos
DROP POLICY IF EXISTS "via_processo" ON public.documentos;
CREATE POLICY "via_processo" ON public.documentos FOR ALL USING (
  processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "via_processo" ON public.factos;
CREATE POLICY "via_processo" ON public.factos FOR ALL USING (
  processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "via_processo" ON public.issues;
CREATE POLICY "via_processo" ON public.issues FOR ALL USING (
  processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "via_processo" ON public.rules;
CREATE POLICY "via_processo" ON public.rules FOR ALL USING (
  processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "via_processo" ON public.applications;
CREATE POLICY "via_processo" ON public.applications FOR ALL USING (
  processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "via_application" ON public.application_factos;
CREATE POLICY "via_application" ON public.application_factos FOR ALL USING (
  application_id IN (
    SELECT id FROM public.applications
    WHERE processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "via_issue" ON public.conclusoes;
CREATE POLICY "via_issue" ON public.conclusoes FOR ALL USING (
  issue_id IN (
    SELECT id FROM public.issues
    WHERE processo_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
  )
);

-- Update get_issue_processo_user_id function
CREATE OR REPLACE FUNCTION public.get_issue_processo_user_id(_issue_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id FROM public.issues i
  JOIN public.dossiers p ON p.id = i.processo_id
  WHERE i.id = _issue_id;
$$;

-- Update disciplina_processos RLS (table stays same name for now)
DROP POLICY IF EXISTS "via_disciplina" ON public.disciplina_processos;
CREATE POLICY "via_disciplina" ON public.disciplina_processos FOR ALL USING (
  disciplina_id IN (SELECT id FROM public.disciplinas WHERE user_id = auth.uid())
);

-- Create actions table
CREATE TABLE public.actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  data date,
  estado text NOT NULL DEFAULT 'ativo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "via_dossier" ON public.actions FOR ALL USING (
  dossier_id IN (SELECT id FROM public.dossiers WHERE user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_actions_updated_at
BEFORE UPDATE ON public.actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
