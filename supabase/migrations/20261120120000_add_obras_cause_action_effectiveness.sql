-- Issue #30: cause analysis, corrective-action verification and occurrence reopening.
-- Existing actions remain the single source of truth; verification records are append-only.

ALTER TABLE public.obras_acoes
  ADD CONSTRAINT obras_acoes_id_ocorrencia_workspace_unique
  UNIQUE (id, ocorrencia_id, workspace_id);

CREATE TABLE public.obras_ocorrencia_causas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  descricao text NOT NULL CHECK (length(btrim(descricao)) > 0),
  estado text NOT NULL DEFAULT 'hipotese' CHECK (estado IN ('hipotese','confirmada','descartada')),
  fundamentacao text NOT NULL CHECK (length(btrim(fundamentacao)) > 0),
  criado_por uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencia_causas_ocorrencia_fk
    FOREIGN KEY (ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_ocorrencia_causas_confirmation_check
    CHECK ((estado = 'confirmada' AND confirmado_em IS NOT NULL) OR estado <> 'confirmada')
);

CREATE TABLE public.obras_acoes_verificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id uuid NOT NULL,
  ocorrencia_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  resultado text NOT NULL CHECK (resultado IN ('eficaz','parcial','ineficaz')),
  descricao text NOT NULL CHECK (length(btrim(descricao)) > 0),
  evidencia text,
  evidencia_foto_id uuid,
  verificado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  verificado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_acoes_verificacoes_action_fk
    FOREIGN KEY (acao_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_acoes(id, ocorrencia_id, workspace_id) ON DELETE CASCADE,
  CONSTRAINT obras_acoes_verificacoes_photo_fk
    FOREIGN KEY (evidencia_foto_id, ocorrencia_id, workspace_id)
    REFERENCES public.obras_fotos(id, ocorrencia_id, workspace_id) ON DELETE RESTRICT
);

CREATE TABLE public.obras_ocorrencia_reaberturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrencia_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  motivo text NOT NULL CHECK (length(btrim(motivo)) > 0),
  reaberta_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  reaberta_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obras_ocorrencia_reaberturas_occurrence_fk
    FOREIGN KEY (ocorrencia_id, workspace_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id) ON DELETE CASCADE
);

CREATE INDEX obras_ocorrencia_causas_occurrence_idx
  ON public.obras_ocorrencia_causas(ocorrencia_id, created_at DESC);
CREATE INDEX obras_acoes_verificacoes_action_idx
  ON public.obras_acoes_verificacoes(acao_id, verificado_em DESC);
CREATE INDEX obras_acoes_verificacoes_occurrence_idx
  ON public.obras_acoes_verificacoes(ocorrencia_id, verificado_em DESC);
CREATE INDEX obras_ocorrencia_reaberturas_occurrence_idx
  ON public.obras_ocorrencia_reaberturas(ocorrencia_id, reaberta_em DESC);

ALTER TABLE public.obras_ocorrencia_causas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_acoes_verificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_ocorrencia_reaberturas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras_ocorrencia_causas TO authenticated;
GRANT SELECT, INSERT ON public.obras_acoes_verificacoes TO authenticated;
GRANT SELECT, INSERT ON public.obras_ocorrencia_reaberturas TO authenticated;
GRANT ALL ON public.obras_ocorrencia_causas, public.obras_acoes_verificacoes, public.obras_ocorrencia_reaberturas TO service_role;

CREATE POLICY obras_ocorrencia_causas_select ON public.obras_ocorrencia_causas
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_causas_insert ON public.obras_ocorrencia_causas
  FOR INSERT TO authenticated WITH CHECK (private.obras_can_write(workspace_id));
CREATE POLICY obras_ocorrencia_causas_update ON public.obras_ocorrencia_causas
  FOR UPDATE TO authenticated USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id));
CREATE POLICY obras_ocorrencia_causas_delete ON public.obras_ocorrencia_causas
  FOR DELETE TO authenticated USING (private.obras_can_write(workspace_id));

CREATE POLICY obras_acoes_verificacoes_select ON public.obras_acoes_verificacoes
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_acoes_verificacoes_insert ON public.obras_acoes_verificacoes
  FOR INSERT TO authenticated WITH CHECK (
    private.obras_can_write(workspace_id) AND verificado_por = (SELECT auth.uid())
  );

CREATE POLICY obras_ocorrencia_reaberturas_select ON public.obras_ocorrencia_reaberturas
  FOR SELECT TO authenticated USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_ocorrencia_reaberturas_insert ON public.obras_ocorrencia_reaberturas
  FOR INSERT TO authenticated WITH CHECK (
    private.obras_can_write(workspace_id) AND reaberta_por = (SELECT auth.uid())
  );

CREATE OR REPLACE FUNCTION private.marcar_confirmacao_causa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'confirmada' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'confirmada') THEN
    NEW.confirmado_por := (SELECT auth.uid());
    NEW.confirmado_em := clock_timestamp();
  ELSIF NEW.estado <> 'confirmada' THEN
    NEW.confirmado_por := NULL;
    NEW.confirmado_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.marcar_confirmacao_causa() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER obras_ocorrencia_causas_confirmation
  BEFORE INSERT OR UPDATE OF estado ON public.obras_ocorrencia_causas
  FOR EACH ROW EXECUTE FUNCTION private.marcar_confirmacao_causa();

CREATE TRIGGER obras_ocorrencia_causas_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_ocorrencia_causas
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_acoes_verificacoes_historico
  AFTER INSERT ON public.obras_acoes_verificacoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_ocorrencia_reaberturas_historico
  AFTER INSERT ON public.obras_ocorrencia_reaberturas
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();

CREATE OR REPLACE FUNCTION public.reabrir_obras_ocorrencia(_ocorrencia_id uuid, _motivo text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE ws_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF _motivo IS NULL OR length(btrim(_motivo)) = 0 THEN RAISE EXCEPTION 'O motivo da reabertura é obrigatório'; END IF;

  SELECT o.workspace_id INTO ws_id
  FROM public.obras_ocorrencias AS o
  WHERE o.id = _ocorrencia_id
  FOR UPDATE;

  IF ws_id IS NULL OR NOT private.obras_can_write(ws_id) THEN
    RAISE EXCEPTION 'Ocorrência inexistente ou sem permissões';
  END IF;

  UPDATE public.obras_ocorrencias SET estado = 'aberta'
  WHERE id = _ocorrencia_id AND workspace_id = ws_id;

  INSERT INTO public.obras_ocorrencia_reaberturas (ocorrencia_id, workspace_id, motivo, reaberta_por)
  VALUES (_ocorrencia_id, ws_id, btrim(_motivo), (SELECT auth.uid()));

  RETURN _ocorrencia_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reabrir_obras_ocorrencia(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reabrir_obras_ocorrencia(uuid, text) TO authenticated;
