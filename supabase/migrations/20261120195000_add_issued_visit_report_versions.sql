-- Issue #62: versioned, immutable snapshots of issued Works visit reports.
CREATE TABLE public.obras_relatorios_emitidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE RESTRICT,
  visita_id uuid NOT NULL REFERENCES public.obras_visitas(id) ON DELETE RESTRICT,
  numero_versao integer NOT NULL CHECK (numero_versao > 0),
  relatorio_anterior_id uuid REFERENCES public.obras_relatorios_emitidos(id) ON DELETE RESTRICT,
  estado text NOT NULL DEFAULT 'emitido' CHECK (estado IN ('rascunho','emitido')),
  emitido_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  emitido_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT obras_relatorios_emitidos_visita_versao_uk UNIQUE (visita_id, numero_versao),
  CONSTRAINT obras_relatorios_emitidos_id_visita_uk UNIQUE (id, visita_id),
  CONSTRAINT obras_relatorios_emitidos_previos_visita_fk
    FOREIGN KEY (relatorio_anterior_id, visita_id)
    REFERENCES public.obras_relatorios_emitidos(id, visita_id)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX obras_relatorios_emitidos_workspace_idx
  ON public.obras_relatorios_emitidos(workspace_id, emitido_em DESC);
CREATE INDEX obras_relatorios_emitidos_visita_idx
  ON public.obras_relatorios_emitidos(visita_id, numero_versao DESC);

ALTER TABLE public.obras_relatorios_emitidos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.obras_relatorios_emitidos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.obras_relatorios_emitidos TO authenticated;
GRANT ALL ON public.obras_relatorios_emitidos TO service_role;

CREATE POLICY obras_relatorios_emitidos_select
  ON public.obras_relatorios_emitidos
  FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));

CREATE OR REPLACE FUNCTION private.proteger_obras_relatorio_emitido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Uma versão emitida é imutável; emita uma nova versão para corrigir o documento';
END;
$$;
REVOKE ALL ON FUNCTION private.proteger_obras_relatorio_emitido() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER obras_relatorios_emitidos_immutable
  BEFORE UPDATE OR DELETE ON public.obras_relatorios_emitidos
  FOR EACH ROW EXECUTE FUNCTION private.proteger_obras_relatorio_emitido();

CREATE TRIGGER obras_relatorios_emitidos_historico
  AFTER INSERT ON public.obras_relatorios_emitidos
  FOR EACH ROW EXECUTE FUNCTION private.registar_obras_historico();

CREATE OR REPLACE FUNCTION public.emitir_relatorio_visita(p_visita_id uuid, p_snapshot jsonb)
RETURNS public.obras_relatorios_emitidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_visita public.obras_visitas%ROWTYPE;
  v_user_id uuid;
  v_versao integer;
  v_anterior uuid;
  v_result public.obras_relatorios_emitidos%ROWTYPE;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão para emitir o relatório';
  END IF;
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'O conteúdo do relatório é inválido';
  END IF;

  SELECT * INTO v_visita
  FROM public.obras_visitas
  WHERE id = p_visita_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visita não encontrada';
  END IF;
  IF NOT private.obras_can_write(v_visita.workspace_id) THEN
    RAISE EXCEPTION 'Sem permissões para emitir relatórios nesta obra';
  END IF;
  IF p_snapshot->>'visita_id' IS DISTINCT FROM p_visita_id::text
     OR p_snapshot->>'obra_id' IS DISTINCT FROM v_visita.obra_id::text THEN
    RAISE EXCEPTION 'O snapshot não corresponde à visita seleccionada';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_visita_id::text, 0));
  SELECT COALESCE(MAX(numero_versao), 0) + 1
    INTO v_versao
  FROM public.obras_relatorios_emitidos
  WHERE visita_id = p_visita_id;
  SELECT id INTO v_anterior
  FROM public.obras_relatorios_emitidos
  WHERE visita_id = p_visita_id
  ORDER BY numero_versao DESC
  LIMIT 1;

  INSERT INTO public.obras_relatorios_emitidos (
    workspace_id, obra_id, visita_id, numero_versao,
    relatorio_anterior_id, estado, emitido_por, snapshot
  ) VALUES (
    v_visita.workspace_id, v_visita.obra_id, v_visita.id, v_versao,
    v_anterior, 'emitido', v_user_id, p_snapshot
  )
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.emitir_relatorio_visita(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emitir_relatorio_visita(uuid, jsonb) TO authenticated;
