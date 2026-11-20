CREATE TABLE public.alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  modulo TEXT NOT NULL CHECK (modulo IN ('juridico','canil','dev')),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_alerta DATE,
  referencia_id UUID,
  referencia_tipo TEXT,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view alertas in their workspace"
ON public.alertas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w
             WHERE w.id = alertas.workspace_id AND w.user_id = auth.uid())
);

CREATE POLICY "Members can insert alertas in their workspace"
ON public.alertas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w
             WHERE w.id = alertas.workspace_id AND w.user_id = auth.uid())
);

CREATE POLICY "Members can update alertas in their workspace"
ON public.alertas FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w
             WHERE w.id = alertas.workspace_id AND w.user_id = auth.uid())
);

CREATE POLICY "Members can delete alertas in their workspace"
ON public.alertas FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = alertas.workspace_id AND wm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.workspaces w
             WHERE w.id = alertas.workspace_id AND w.user_id = auth.uid())
);

CREATE INDEX idx_alertas_workspace_lido ON public.alertas (workspace_id, lido);
CREATE INDEX idx_alertas_data ON public.alertas (data_alerta);
