-- Issue #26: immutable audit history for technical records and decisions.
CREATE TABLE public.obras_historico_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  entidade_pai text,
  entidade_pai_id uuid,
  operacao text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ocorrido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  dados_anteriores jsonb,
  dados_novos jsonb
);

CREATE INDEX obras_historico_workspace_time_idx
  ON public.obras_historico_eventos(workspace_id, ocorrido_em DESC);
CREATE INDEX obras_historico_entidade_idx
  ON public.obras_historico_eventos(entidade, entidade_id, ocorrido_em DESC);
CREATE INDEX obras_historico_parent_idx
  ON public.obras_historico_eventos(entidade_pai, entidade_pai_id, ocorrido_em DESC);

ALTER TABLE public.obras_historico_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.obras_historico_eventos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.obras_historico_eventos TO authenticated;
GRANT ALL ON public.obras_historico_eventos TO service_role;

CREATE POLICY obras_historico_select ON public.obras_historico_eventos
  FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));

CREATE OR REPLACE FUNCTION private.registar_obras_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  ws_id uuid;
  entity_id uuid;
  parent_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data := to_jsonb(NEW); END IF;
  row_data := COALESCE(new_data, old_data);
  ws_id := NULLIF(row_data->>'workspace_id', '')::uuid;
  entity_id := NULLIF(row_data->>'id', '')::uuid;
  parent_id := COALESCE(
    NULLIF(row_data->>'ocorrencia_id', '')::uuid,
    NULLIF(row_data->>'obra_id', '')::uuid,
    entity_id
  );

  IF ws_id IS NULL OR entity_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar workspace e registo para auditoria';
  END IF;

  INSERT INTO public.obras_historico_eventos (
    workspace_id, entidade, entidade_id, entidade_pai, entidade_pai_id,
    operacao, actor_id, dados_anteriores, dados_novos
  ) VALUES (
    ws_id, TG_TABLE_NAME, entity_id,
    CASE WHEN row_data ? 'ocorrencia_id' THEN 'obras_ocorrencias'
         WHEN row_data ? 'obra_id' THEN 'obras'
         ELSE TG_TABLE_NAME END,
    parent_id,
    TG_OP, (SELECT auth.uid()), old_data, new_data
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.registar_obras_historico() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_ocorrencias_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_ocorrencia_analises_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_ocorrencia_analises
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_ocorrencia_factos_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_ocorrencia_factos
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_ocorrencia_referencias_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_ocorrencia_referencias
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
CREATE TRIGGER obras_acoes_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.obras_acoes
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();
