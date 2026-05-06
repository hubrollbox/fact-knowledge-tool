-- 020 dev_projectos
CREATE TABLE public.dev_projectos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  repo_url text,
  docs_url text,
  deploy_url text,
  stack text[] NOT NULL DEFAULT '{}',
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pausado','arquivado')),
  versao_actual text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dev_projectos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dev_projectos_workspace ON public.dev_projectos(workspace_id);

CREATE POLICY "Members can view projectos in their workspace" ON public.dev_projectos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_projectos.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can insert projectos in their workspace" ON public.dev_projectos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_projectos.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can update projectos in their workspace" ON public.dev_projectos
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_projectos.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can delete projectos in their workspace" ON public.dev_projectos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_projectos.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_projectos.workspace_id AND w.user_id = auth.uid())
  );

-- 021 dev_issues
CREATE TABLE public.dev_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projecto_id uuid NOT NULL REFERENCES public.dev_projectos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('bug','feature','decisao','discussao','outro')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('critica','alta','media','baixa')),
  estado text NOT NULL DEFAULT 'aberto' CHECK (estado IN ('aberto','em_progresso','resolvido','fechado')),
  milestone text,
  assignee text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dev_issues ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dev_issues_workspace ON public.dev_issues(workspace_id);
CREATE INDEX idx_dev_issues_projecto ON public.dev_issues(projecto_id);

CREATE POLICY "Members can view issues in their workspace" ON public.dev_issues
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_issues.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can insert issues in their workspace" ON public.dev_issues
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_issues.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can update issues in their workspace" ON public.dev_issues
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_issues.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can delete issues in their workspace" ON public.dev_issues
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_issues.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_issues.workspace_id AND w.user_id = auth.uid())
  );

-- 022 dev_adrs
CREATE TABLE public.dev_adrs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projecto_id uuid NOT NULL REFERENCES public.dev_projectos(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  titulo text NOT NULL,
  numero int NOT NULL DEFAULT 1,
  contexto text,
  problema text,
  alternativas text,
  analise text,
  decisao text,
  estado text NOT NULL DEFAULT 'proposto' CHECK (estado IN ('proposto','aceite','depreciado','substituido')),
  substitui_id uuid REFERENCES public.dev_adrs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dev_adrs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dev_adrs_workspace ON public.dev_adrs(workspace_id);
CREATE INDEX idx_dev_adrs_projecto ON public.dev_adrs(projecto_id);

CREATE POLICY "Members can view adrs in their workspace" ON public.dev_adrs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_adrs.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can insert adrs in their workspace" ON public.dev_adrs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_adrs.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can update adrs in their workspace" ON public.dev_adrs
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_adrs.workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "Members can delete adrs in their workspace" ON public.dev_adrs
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = dev_adrs.workspace_id AND wm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = dev_adrs.workspace_id AND w.user_id = auth.uid())
  );