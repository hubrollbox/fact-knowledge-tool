-- Issue #40: extend the existing Works actions with ownership integrity,
-- visit context, priority, immutable discussion and document evidence.
-- This migration is committed to source control only; it is not applied here.

ALTER TABLE public.obras_acoes
  ADD COLUMN prioridade text NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  ADD COLUMN visita_id uuid,
  ADD COLUMN concluida_em timestamptz;

ALTER TABLE public.obras_acoes
  DROP CONSTRAINT obras_acoes_estado_check,
  ADD CONSTRAINT obras_acoes_estado_check
    CHECK (estado IN ('pendente','em_curso','bloqueada','concluida','cancelada'));

ALTER TABLE public.obras_acoes
  ADD CONSTRAINT obras_acoes_id_workspace_obra_unique UNIQUE (id, workspace_id, obra_id),
  ADD CONSTRAINT obras_acoes_visita_context_fk
    FOREIGN KEY (visita_id, workspace_id, obra_id)
    REFERENCES public.obras_visitas(id, workspace_id, obra_id)
    ON DELETE SET NULL (visita_id);

-- A document version can be linked to an action only inside the same workspace
-- and the same work. The existing private document bucket and policies remain in use.
ALTER TABLE public.obras_documento_versoes
  ADD CONSTRAINT obras_documento_versoes_id_workspace_obra_unique
    UNIQUE (id, workspace_id, obra_id);

CREATE TABLE public.obras_acoes_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  mensagem text NOT NULL CHECK (length(btrim(mensagem)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_acoes_comentarios_action_fk
    FOREIGN KEY (acao_id, workspace_id, obra_id)
    REFERENCES public.obras_acoes(id, workspace_id, obra_id) ON DELETE CASCADE
);

CREATE TABLE public.obras_acoes_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL,
  documento_versao_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  criado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_acoes_anexos_action_fk
    FOREIGN KEY (acao_id, workspace_id, obra_id)
    REFERENCES public.obras_acoes(id, workspace_id, obra_id) ON DELETE CASCADE,
  CONSTRAINT obras_acoes_anexos_document_fk
    FOREIGN KEY (documento_versao_id, workspace_id, obra_id)
    REFERENCES public.obras_documento_versoes(id, workspace_id, obra_id) ON DELETE RESTRICT,
  CONSTRAINT obras_acoes_anexos_unique UNIQUE (acao_id, documento_versao_id)
);

CREATE INDEX obras_acoes_workspace_priority_due_idx
  ON public.obras_acoes(workspace_id, prioridade, prazo)
  WHERE estado NOT IN ('concluida','cancelada');
CREATE INDEX obras_acoes_visita_idx
  ON public.obras_acoes(visita_id) WHERE visita_id IS NOT NULL;
CREATE INDEX obras_acoes_comentarios_action_time_idx
  ON public.obras_acoes_comentarios(acao_id, created_at);
CREATE INDEX obras_acoes_anexos_action_idx
  ON public.obras_acoes_anexos(acao_id, created_at);

ALTER TABLE public.obras_acoes_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_acoes_anexos ENABLE ROW LEVEL SECURITY;

-- Default privileges in this project may grant broad access to authenticated.
-- Revoke first: GRANT statements are additive, not restrictive.
REVOKE ALL ON TABLE public.obras_acoes_comentarios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.obras_acoes_anexos FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON public.obras_acoes_comentarios TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.obras_acoes_anexos TO authenticated;
GRANT ALL ON public.obras_acoes_comentarios, public.obras_acoes_anexos TO service_role;

CREATE POLICY obras_acoes_comentarios_select
  ON public.obras_acoes_comentarios FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_acoes_comentarios_insert
  ON public.obras_acoes_comentarios FOR INSERT TO authenticated
  WITH CHECK (
    private.obras_can_write(workspace_id)
    AND autor_id = (SELECT auth.uid())
  );
CREATE POLICY obras_acoes_anexos_select
  ON public.obras_acoes_anexos FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_acoes_anexos_insert
  ON public.obras_acoes_anexos FOR INSERT TO authenticated
  WITH CHECK (
    private.obras_can_write(workspace_id)
    AND criado_por = (SELECT auth.uid())
  );
CREATE POLICY obras_acoes_anexos_delete
  ON public.obras_acoes_anexos FOR DELETE TO authenticated
  USING (private.obras_can_write(workspace_id));

-- Enforce assignment to an eligible member of the same workspace, including
-- the workspace owner. This is server-side validation, not merely a UI check.
CREATE OR REPLACE FUNCTION private.validar_responsavel_obras_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.responsavel_user_id IS NOT NULL
     AND NOT (
       EXISTS (
         SELECT 1 FROM public.workspaces w
         WHERE w.id = NEW.workspace_id AND w.user_id = NEW.responsavel_user_id
       )
       OR EXISTS (
         SELECT 1
         FROM public.workspace_members wm
         WHERE wm.workspace_id = NEW.workspace_id
           AND wm.user_id = NEW.responsavel_user_id
           AND wm.role IN ('admin','editor')
       )
     )
  THEN
    RAISE EXCEPTION 'O responsável tem de ser proprietário, administrador ou editor deste espaço de trabalho'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.estado = 'concluida' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'concluida') THEN
    NEW.concluida_em := clock_timestamp();
  ELSIF NEW.estado <> 'concluida' THEN
    NEW.concluida_em := NULL;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validar_responsavel_obras_acao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_acoes_validar_responsavel
  BEFORE INSERT OR UPDATE OF responsavel_user_id, estado, workspace_id
  ON public.obras_acoes
  FOR EACH ROW EXECUTE FUNCTION private.validar_responsavel_obras_acao();

-- Immutable comments and attachment links are recorded in the existing Works
-- history stream. No separate audit table is introduced.
CREATE OR REPLACE FUNCTION private.registar_obras_acao_comunicacao_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_data jsonb;
  entity_id uuid;
  ws_id uuid;
  action_id uuid;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  entity_id := NULLIF(row_data->>'id','')::uuid;
  ws_id := NULLIF(row_data->>'workspace_id','')::uuid;
  action_id := NULLIF(row_data->>'acao_id','')::uuid;

  INSERT INTO public.obras_historico_eventos (
    workspace_id, entidade, entidade_id, entidade_pai, entidade_pai_id,
    operacao, actor_id, dados_anteriores, dados_novos
  ) VALUES (
    ws_id, TG_TABLE_NAME, entity_id, 'obras_acoes', action_id,
    TG_OP, (SELECT auth.uid()),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.registar_obras_acao_comunicacao_historico() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_acoes_comentarios_historico
  AFTER INSERT ON public.obras_acoes_comentarios
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_acao_comunicacao_historico();
CREATE TRIGGER obras_acoes_anexos_historico
  AFTER INSERT OR DELETE ON public.obras_acoes_anexos
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_acao_comunicacao_historico();

-- Internal notification on a new comment: notify the assignee, never an
-- external address. The notification contains no comment body or document data.
CREATE OR REPLACE FUNCTION private.notificar_comentario_obras_acao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assignee uuid;
BEGIN
  SELECT a.responsavel_user_id INTO assignee
  FROM public.obras_acoes a
  WHERE a.id = NEW.acao_id AND a.workspace_id = NEW.workspace_id
    AND (
      EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = a.workspace_id AND w.user_id = a.responsavel_user_id)
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = a.workspace_id AND wm.user_id = a.responsavel_user_id
          AND wm.role IN ('admin','editor')
      )
    );

  IF assignee IS NOT NULL AND assignee <> NEW.autor_id THEN
    INSERT INTO public.alertas (
      workspace_id, user_id, modulo, tipo, titulo, descricao,
      data_alerta, referencia_id, referencia_tipo
    ) VALUES (
      NEW.workspace_id, assignee, 'obras', 'acao_comentario',
      'Novo comentário numa acção', 'Foi adicionado um comentário a uma acção atribuída.',
      CURRENT_DATE, NEW.acao_id, 'obras_acoes'
    )
    ON CONFLICT (workspace_id, user_id, referencia_id, referencia_tipo, tipo, data_alerta)
      WHERE modulo = 'obras'
        AND user_id IS NOT NULL
        AND referencia_id IS NOT NULL
        AND referencia_tipo = 'obras_acoes'
    DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.notificar_comentario_obras_acao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_acoes_comentario_notificacao
  AFTER INSERT ON public.obras_acoes_comentarios
  FOR EACH ROW EXECUTE FUNCTION private.notificar_comentario_obras_acao();

COMMENT ON COLUMN public.obras_acoes.visita_id IS
  'Visita que originou a acção; opcional e sempre pertencente à mesma obra e workspace.';
COMMENT ON COLUMN public.obras_acoes.prioridade IS
  'Prioridade operacional: baixa, normal, alta ou urgente.';


-- Cancelled actions must not produce deadline alerts when the queue is opened.
CREATE OR REPLACE FUNCTION public.sincronizar_alertas_obras_acoes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_count integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;

  INSERT INTO public.alertas (
    workspace_id, user_id, modulo, tipo, titulo, descricao,
    data_alerta, referencia_id, referencia_tipo
  )
  SELECT
    a.workspace_id,
    v_user,
    'obras',
    CASE WHEN a.prazo < CURRENT_DATE THEN 'acao_atrasada' ELSE 'acao_prazo_proximo' END,
    CASE WHEN a.prazo < CURRENT_DATE THEN 'Acção em atraso' ELSE 'Prazo de acção próximo' END,
    a.descricao,
    a.prazo,
    a.id,
    'obras_acoes'
  FROM public.obras_acoes AS a
  WHERE a.responsavel_user_id = v_user
    AND a.estado NOT IN ('concluida','cancelada')
    AND a.prazo IS NOT NULL
    AND a.prazo <= CURRENT_DATE + 3
    AND private.obras_can_read(a.workspace_id)
  ON CONFLICT (workspace_id, user_id, referencia_id, referencia_tipo, tipo, data_alerta)
    WHERE modulo = 'obras'
      AND user_id IS NOT NULL
      AND referencia_id IS NOT NULL
      AND referencia_tipo = 'obras_acoes'
  DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_alertas_obras_acoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sincronizar_alertas_obras_acoes() TO authenticated;
