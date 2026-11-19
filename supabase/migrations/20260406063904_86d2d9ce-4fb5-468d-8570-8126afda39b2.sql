
-- =============================================
-- 030: juridico_processos
-- =============================================
CREATE TABLE public.juridico_processos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  referencia text,
  numero_processo text,
  titulo text NOT NULL,
  tipo text CHECK (tipo IN ('civel', 'penal', 'administrativo', 'laboral', 'outro')),
  tribunal text,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspenso', 'concluido', 'arquivado')),
  contexto text,
  questao text,
  referencias text,
  analise text,
  conclusao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.juridico_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_access"
  ON public.juridico_processos
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_juridico_processos_updated_at
  BEFORE UPDATE ON public.juridico_processos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 031: juridico_partes
-- =============================================
CREATE TABLE public.juridico_partes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.juridico_processos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('cliente', 'contraparte', 'testemunha', 'perito', 'outro')),
  nome text NOT NULL,
  nif text,
  contacto text,
  mandatario text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.juridico_partes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_access"
  ON public.juridico_partes
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_juridico_partes_updated_at
  BEFORE UPDATE ON public.juridico_partes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 032: juridico_documentos
-- =============================================
CREATE TABLE public.juridico_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.juridico_processos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text DEFAULT 'outro' CHECK (categoria IN ('peticao', 'contestacao', 'replica', 'despacho', 'sentenca', 'acordao', 'correspondencia', 'prova', 'outro')),
  ficheiro_url text,
  versao integer NOT NULL DEFAULT 1,
  data_documento date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.juridico_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_access"
  ON public.juridico_documentos
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_juridico_documentos_updated_at
  BEFORE UPDATE ON public.juridico_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 033: juridico_prazos
-- =============================================
CREATE TABLE public.juridico_prazos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.juridico_processos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  data_limite date NOT NULL,
  antecedencia_alerta integer NOT NULL DEFAULT 5,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'cumprido', 'perdido')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.juridico_prazos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_access"
  ON public.juridico_prazos
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_juridico_prazos_updated_at
  BEFORE UPDATE ON public.juridico_prazos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
