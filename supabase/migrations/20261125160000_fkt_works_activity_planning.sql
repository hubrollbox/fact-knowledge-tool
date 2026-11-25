-- Issue #44: lightweight Works planning and execution tracking.
BEGIN;
CREATE TABLE public.obras_actividades (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
 titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 240),
 descricao text,
 data_inicio_prevista date,
 data_fim_prevista date,
 duracao_dias integer CHECK (duracao_dias IS NULL OR duracao_dias > 0),
 responsavel text,
 responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 estado text NOT NULL DEFAULT 'planeada' CHECK (estado IN ('planeada','em_curso','concluida','bloqueada','cancelada')),
 data_inicio_real date,
 data_fim_real date,
 motivo_desvio text,
 acao_id uuid REFERENCES public.obras_acoes(id) ON DELETE SET NULL,
 ocorrencia_id uuid REFERENCES public.obras_ocorrencias(id) ON DELETE SET NULL,
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT obras_actividades_datas_previstas_check CHECK (data_inicio_prevista IS NULL OR data_fim_prevista IS NULL OR data_fim_prevista >= data_inicio_prevista),
 CONSTRAINT obras_actividades_datas_reais_check CHECK (data_inicio_real IS NULL OR data_fim_real IS NULL OR data_fim_real >= data_inicio_real),
 CONSTRAINT obras_actividades_id_workspace_obra_unique UNIQUE (id, workspace_id, obra_id)
);
CREATE INDEX obras_actividades_workspace_obra_dates_idx ON public.obras_actividades(workspace_id, obra_id, data_inicio_prevista, data_fim_prevista);
CREATE INDEX obras_actividades_status_idx ON public.obras_actividades(workspace_id, estado, data_fim_prevista);
CREATE INDEX obras_actividades_action_idx ON public.obras_actividades(acao_id) WHERE acao_id IS NOT NULL;
CREATE INDEX obras_actividades_occurrence_idx ON public.obras_actividades(ocorrencia_id) WHERE ocorrencia_id IS NOT NULL;

CREATE TABLE public.obras_actividades_dependencias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
 actividade_id uuid NOT NULL,
 depende_de_id uuid NOT NULL,
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT obras_actividades_dependencias_not_self CHECK (actividade_id <> depende_de_id),
 CONSTRAINT obras_actividades_dependencias_unique UNIQUE (actividade_id, depende_de_id),
 CONSTRAINT obras_actividades_dependencias_activity_fk FOREIGN KEY (actividade_id, workspace_id, obra_id) REFERENCES public.obras_actividades(id, workspace_id, obra_id) ON DELETE CASCADE,
 CONSTRAINT obras_actividades_dependencias_predecessor_fk FOREIGN KEY (depende_de_id, workspace_id, obra_id) REFERENCES public.obras_actividades(id, workspace_id, obra_id) ON DELETE CASCADE
);
CREATE INDEX obras_actividades_dependencias_predecessor_idx ON public.obras_actividades_dependencias(workspace_id, obra_id, depende_de_id);

ALTER TABLE public.obras_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_actividades_dependencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.obras_actividades, public.obras_actividades_dependencias FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.obras_actividades TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.obras_actividades_dependencias TO authenticated;
GRANT ALL ON TABLE public.obras_actividades, public.obras_actividades_dependencias TO service_role;

CREATE POLICY obras_actividades_select ON public.obras_actividades FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_actividades_insert ON public.obras_actividades FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY obras_actividades_update ON public.obras_actividades FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id)) WITH CHECK (private.obras_can_write(workspace_id));
CREATE POLICY obras_actividades_delete ON public.obras_actividades FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));
CREATE POLICY obras_actividades_dependencias_select ON public.obras_actividades_dependencias FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_actividades_dependencias_insert ON public.obras_actividades_dependencias FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id) AND created_by = (SELECT auth.uid()));
CREATE POLICY obras_actividades_dependencias_delete ON public.obras_actividades_dependencias FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

CREATE OR REPLACE FUNCTION private.validar_obras_actividade()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.obras o WHERE o.id=NEW.obra_id AND o.workspace_id=NEW.workspace_id) THEN
  RAISE EXCEPTION 'A actividade tem de pertencer à obra e ao espaço de trabalho indicados' USING ERRCODE='23514';
 END IF;
 IF NEW.responsavel_user_id IS NOT NULL AND NOT (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id=NEW.workspace_id AND w.user_id=NEW.responsavel_user_id)
  OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id=NEW.workspace_id AND wm.user_id=NEW.responsavel_user_id AND wm.role IN ('admin','editor'))
 ) THEN RAISE EXCEPTION 'O responsável tem de ser proprietário, administrador ou editor deste espaço de trabalho' USING ERRCODE='23514'; END IF;
 IF NEW.acao_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.obras_acoes a WHERE a.id=NEW.acao_id AND a.obra_id=NEW.obra_id AND a.workspace_id=NEW.workspace_id) THEN
  RAISE EXCEPTION 'A tarefa associada não pertence à mesma obra e espaço de trabalho' USING ERRCODE='23514';
 END IF;
 IF NEW.ocorrencia_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.obras_ocorrencias o WHERE o.id=NEW.ocorrencia_id AND o.obra_id=NEW.obra_id AND o.workspace_id=NEW.workspace_id) THEN
  RAISE EXCEPTION 'A ocorrência associada não pertence à mesma obra e espaço de trabalho' USING ERRCODE='23514';
 END IF;
 IF NEW.estado IN ('em_curso','concluida') AND EXISTS (
  SELECT 1 FROM public.obras_actividades_dependencias d
  JOIN public.obras_actividades p ON p.id=d.depende_de_id AND p.workspace_id=d.workspace_id AND p.obra_id=d.obra_id
  WHERE d.actividade_id=NEW.id AND d.workspace_id=NEW.workspace_id AND d.obra_id=NEW.obra_id AND p.estado<>'concluida'
 ) THEN RAISE EXCEPTION 'Não é possível iniciar ou concluir a actividade enquanto existirem dependências por concluir' USING ERRCODE='23514'; END IF;
 IF NEW.estado<>'concluida' AND EXISTS (
  SELECT 1 FROM public.obras_actividades_dependencias d
  JOIN public.obras_actividades dependent ON dependent.id=d.actividade_id AND dependent.workspace_id=d.workspace_id AND dependent.obra_id=d.obra_id
  WHERE d.depende_de_id=NEW.id AND d.workspace_id=NEW.workspace_id AND d.obra_id=NEW.obra_id
    AND dependent.estado IN ('em_curso','concluida')
 ) THEN RAISE EXCEPTION 'Não é possível reabrir uma actividade enquanto existirem actividades dependentes em curso ou concluídas' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validar_obras_actividade() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_actividades_validar BEFORE INSERT OR UPDATE ON public.obras_actividades FOR EACH ROW EXECUTE FUNCTION private.validar_obras_actividade();
CREATE TRIGGER obras_actividades_updated_at BEFORE UPDATE ON public.obras_actividades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.validar_obras_actividade_dependencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE creates_cycle boolean;
BEGIN
 IF NEW.actividade_id=NEW.depende_de_id THEN RAISE EXCEPTION 'Uma actividade não pode depender de si própria' USING ERRCODE='23514'; END IF;
 WITH RECURSIVE reachable(id) AS (
  SELECT d.depende_de_id FROM public.obras_actividades_dependencias d
  WHERE d.actividade_id=NEW.depende_de_id AND d.workspace_id=NEW.workspace_id AND d.obra_id=NEW.obra_id
  UNION
  SELECT d.depende_de_id FROM public.obras_actividades_dependencias d JOIN reachable r ON d.actividade_id=r.id
  WHERE d.workspace_id=NEW.workspace_id AND d.obra_id=NEW.obra_id
 )
 SELECT EXISTS (SELECT 1 FROM reachable WHERE id=NEW.actividade_id) INTO creates_cycle;
 IF creates_cycle THEN RAISE EXCEPTION 'Esta dependência criaria um ciclo no planeamento' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validar_obras_actividade_dependencia() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_actividades_dependencias_validar BEFORE INSERT OR UPDATE ON public.obras_actividades_dependencias FOR EACH ROW EXECUTE FUNCTION private.validar_obras_actividade_dependencia();

CREATE OR REPLACE FUNCTION public.definir_dependencias_obras_actividade(p_actividade_id uuid, p_dependencias uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_activity public.obras_actividades%ROWTYPE; v_dependency uuid;
BEGIN
 SELECT * INTO v_activity FROM public.obras_actividades WHERE id=p_actividade_id;
 IF NOT FOUND OR NOT private.obras_can_write(v_activity.workspace_id) THEN
  RAISE EXCEPTION 'Actividade não encontrada ou sem permissões de edição' USING ERRCODE='42501';
 END IF;
 DELETE FROM public.obras_actividades_dependencias
 WHERE actividade_id=p_actividade_id AND workspace_id=v_activity.workspace_id AND obra_id=v_activity.obra_id;
 FOR v_dependency IN SELECT DISTINCT unnest(COALESCE(p_dependencias,ARRAY[]::uuid[])) LOOP
  INSERT INTO public.obras_actividades_dependencias(workspace_id,obra_id,actividade_id,depende_de_id,created_by)
  VALUES(v_activity.workspace_id,v_activity.obra_id,p_actividade_id,v_dependency,auth.uid());
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.definir_dependencias_obras_actividade(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_dependencias_obras_actividade(uuid,uuid[]) TO authenticated;
COMMENT ON TABLE public.obras_actividades IS 'Planeamento simples de actividades por obra, com datas previstas/reais, responsável, estado e desvios.';
COMMENT ON TABLE public.obras_actividades_dependencias IS 'Dependências directas entre actividades da mesma obra; ciclos são rejeitados pela base de dados.';
COMMIT;
