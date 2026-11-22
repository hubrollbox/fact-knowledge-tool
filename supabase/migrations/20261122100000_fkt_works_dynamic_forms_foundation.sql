-- FKT Works: reusable, versioned dynamic forms and visit responses (Issue #38).
-- This migration is intentionally additive. It does not modify existing visit or report data.

BEGIN;

CREATE TABLE public.obras_formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 2 AND 160),
  descricao text,
  tipo text NOT NULL DEFAULT 'visita'
    CHECK (tipo IN ('visita', 'inspeccao', 'verificacao', 'outro')),
  estado text NOT NULL DEFAULT 'rascunho'
    CHECK (estado IN ('rascunho', 'activo', 'arquivado')),
  current_version_id uuid,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT obras_formularios_id_workspace_uk UNIQUE (id, workspace_id)
);

CREATE TABLE public.obras_formularios_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  numero_versao integer NOT NULL CHECK (numero_versao > 0),
  definicao jsonb NOT NULL CHECK (jsonb_typeof(definicao) = 'object'),
  criado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT obras_formularios_versoes_formulario_fk
    FOREIGN KEY (formulario_id, workspace_id)
    REFERENCES public.obras_formularios(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT obras_formularios_versoes_numero_uk UNIQUE (formulario_id, numero_versao),
  CONSTRAINT obras_formularios_versoes_id_form_ws_uk UNIQUE (id, formulario_id, workspace_id)
);

ALTER TABLE public.obras_formularios
  ADD CONSTRAINT obras_formularios_current_version_fk
  FOREIGN KEY (current_version_id, id, workspace_id)
  REFERENCES public.obras_formularios_versoes(id, formulario_id, workspace_id)
  ON DELETE RESTRICT;

CREATE TABLE public.obras_formularios_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  visita_id uuid NOT NULL,
  ocorrencia_id uuid,
  formulario_id uuid NOT NULL,
  versao_id uuid NOT NULL,
  definicao_snapshot jsonb NOT NULL CHECK (jsonb_typeof(definicao_snapshot) = 'object'),
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(respostas) = 'object'),
  estado text NOT NULL DEFAULT 'rascunho' CHECK (estado IN ('rascunho', 'concluido')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT obras_formularios_respostas_workspace_obra_fk
    FOREIGN KEY (obra_id, workspace_id)
    REFERENCES public.obras(id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT obras_formularios_respostas_workspace_visita_fk
    FOREIGN KEY (visita_id, workspace_id, obra_id)
    REFERENCES public.obras_visitas(id, workspace_id, obra_id) ON DELETE RESTRICT,
  CONSTRAINT obras_formularios_respostas_workspace_ocorrencia_fk
    FOREIGN KEY (ocorrencia_id, workspace_id, obra_id)
    REFERENCES public.obras_ocorrencias(id, workspace_id, obra_id) ON DELETE RESTRICT,
  CONSTRAINT obras_formularios_respostas_versao_fk
    FOREIGN KEY (versao_id, formulario_id, workspace_id)
    REFERENCES public.obras_formularios_versoes(id, formulario_id, workspace_id) ON DELETE RESTRICT,
  CONSTRAINT obras_formularios_respostas_estado_conclusao_check
    CHECK (
      (estado = 'rascunho' AND completed_at IS NULL AND completed_by IS NULL)
      OR (estado = 'concluido' AND completed_at IS NOT NULL AND completed_by IS NOT NULL)
    )
);

CREATE INDEX obras_formularios_workspace_estado_idx
  ON public.obras_formularios(workspace_id, estado, nome);
CREATE INDEX obras_formularios_versoes_formulario_idx
  ON public.obras_formularios_versoes(formulario_id, numero_versao DESC);
CREATE INDEX obras_formularios_respostas_visita_idx
  ON public.obras_formularios_respostas(workspace_id, visita_id, created_at DESC);
CREATE INDEX obras_formularios_respostas_obra_idx
  ON public.obras_formularios_respostas(workspace_id, obra_id, created_at DESC);
CREATE INDEX obras_formularios_respostas_ocorrencia_idx
  ON public.obras_formularios_respostas(ocorrencia_id)
  WHERE ocorrencia_id IS NOT NULL;

ALTER TABLE public.obras_formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_formularios_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras_formularios_respostas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.obras_formularios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.obras_formularios_versoes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.obras_formularios_respostas FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.obras_formularios TO authenticated;
GRANT INSERT (workspace_id, nome, descricao, tipo) ON public.obras_formularios TO authenticated;
GRANT UPDATE (nome, descricao, tipo, estado) ON public.obras_formularios TO authenticated;
GRANT SELECT ON public.obras_formularios_versoes TO authenticated;
GRANT SELECT ON public.obras_formularios_respostas TO authenticated;
GRANT UPDATE (respostas) ON public.obras_formularios_respostas TO authenticated;
GRANT ALL ON public.obras_formularios, public.obras_formularios_versoes, public.obras_formularios_respostas TO service_role;

CREATE POLICY obras_formularios_select
  ON public.obras_formularios FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_formularios_insert
  ON public.obras_formularios FOR INSERT TO authenticated
  WITH CHECK (private.obras_can_write(workspace_id) AND created_by = auth.uid() AND updated_by = auth.uid());
CREATE POLICY obras_formularios_update
  ON public.obras_formularios FOR UPDATE TO authenticated
  USING (private.obras_can_write(workspace_id))
  WITH CHECK (private.obras_can_write(workspace_id));

CREATE POLICY obras_formularios_versoes_select
  ON public.obras_formularios_versoes FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_formularios_respostas_select
  ON public.obras_formularios_respostas FOR SELECT TO authenticated
  USING (private.obras_can_read(workspace_id));
CREATE POLICY obras_formularios_respostas_update
  ON public.obras_formularios_respostas FOR UPDATE TO authenticated
  USING (private.obras_can_write(workspace_id) AND estado = 'rascunho')
  WITH CHECK (private.obras_can_write(workspace_id) AND estado = 'rascunho');

CREATE OR REPLACE FUNCTION private.obras_formularios_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.updated_by := auth.uid();
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.current_version_id IS DISTINCT FROM OLD.current_version_id THEN
    RAISE EXCEPTION 'Não é permitido alterar a identidade, o workspace ou a versão publicada do modelo directamente';
  END IF;
  IF NEW.estado = 'activo' AND NEW.current_version_id IS NULL THEN
    RAISE EXCEPTION 'Um modelo só pode ser activado depois de publicada a primeira versão';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER obras_formularios_set_updated_at
  BEFORE UPDATE ON public.obras_formularios
  FOR EACH ROW EXECUTE FUNCTION private.obras_formularios_set_updated_at();

CREATE OR REPLACE FUNCTION private.obras_formularios_versao_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'As versões publicadas dos formulários são imutáveis; publique uma nova versão';
END;
$$;

CREATE TRIGGER obras_formularios_versoes_immutable
  BEFORE UPDATE OR DELETE ON public.obras_formularios_versoes
  FOR EACH ROW EXECUTE FUNCTION private.obras_formularios_versao_immutable();

CREATE OR REPLACE FUNCTION private.obras_formularios_resposta_protect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.estado = 'concluido' THEN
    RAISE EXCEPTION 'Uma resposta concluída é imutável';
  END IF;
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.obra_id IS DISTINCT FROM OLD.obra_id
     OR NEW.visita_id IS DISTINCT FROM OLD.visita_id
     OR NEW.ocorrencia_id IS DISTINCT FROM OLD.ocorrencia_id
     OR NEW.formulario_id IS DISTINCT FROM OLD.formulario_id
     OR NEW.versao_id IS DISTINCT FROM OLD.versao_id
     OR NEW.definicao_snapshot IS DISTINCT FROM OLD.definicao_snapshot
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.estado IS DISTINCT FROM OLD.estado
     OR NEW.completed_by IS DISTINCT FROM OLD.completed_by
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Só é permitido alterar as respostas de um formulário em rascunho';
  END IF;
  NEW.updated_at := clock_timestamp();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER obras_formularios_respostas_protect
  BEFORE UPDATE OR DELETE ON public.obras_formularios_respostas
  FOR EACH ROW EXECUTE FUNCTION private.obras_formularios_resposta_protect();

-- Publishing creates a new immutable version and atomically makes it current.
CREATE OR REPLACE FUNCTION public.publicar_obras_formulario(
  p_formulario_id uuid,
  p_definicao jsonb
)
RETURNS public.obras_formularios_versoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form public.obras_formularios%ROWTYPE;
  v_version public.obras_formularios_versoes%ROWTYPE;
  v_section jsonb;
  v_field jsonb;
  v_ids text[] := ARRAY[]::text[];
  v_section_id text;
  v_field_id text;
  v_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;
  IF p_definicao IS NULL OR jsonb_typeof(p_definicao) <> 'object'
     OR jsonb_typeof(p_definicao->'sections') <> 'array'
     OR jsonb_array_length(p_definicao->'sections') = 0 THEN
    RAISE EXCEPTION 'A definição tem de conter pelo menos uma secção';
  END IF;

  SELECT * INTO v_form
  FROM public.obras_formularios
  WHERE id = p_formulario_id
  FOR UPDATE;
  IF NOT FOUND OR NOT private.obras_can_write(v_form.workspace_id) THEN
    RAISE EXCEPTION 'Modelo não encontrado ou sem permissões de edição';
  END IF;
  IF v_form.estado = 'arquivado' THEN
    RAISE EXCEPTION 'Não é possível publicar versões de um modelo arquivado';
  END IF;

  FOR v_section IN SELECT value FROM jsonb_array_elements(p_definicao->'sections') LOOP
    v_section_id := nullif(btrim(v_section->>'id'), '');
    IF v_section_id IS NULL OR nullif(btrim(v_section->>'title'), '') IS NULL
       OR jsonb_typeof(v_section->'fields') <> 'array' THEN
      RAISE EXCEPTION 'Cada secção necessita de identificador, título e lista de campos';
    END IF;
    FOR v_field IN SELECT value FROM jsonb_array_elements(v_section->'fields') LOOP
      v_field_id := nullif(btrim(v_field->>'id'), '');
      v_type := v_field->>'type';
      IF v_field_id IS NULL OR nullif(btrim(v_field->>'label'), '') IS NULL
         OR v_type NOT IN ('text', 'number', 'date', 'choice', 'boolean', 'attachment', 'photo')
         OR jsonb_typeof(v_field->'required') <> 'boolean' THEN
        RAISE EXCEPTION 'Cada campo necessita de identificador, rótulo, tipo suportado e indicação required';
      END IF;
      IF v_field_id = ANY(v_ids) THEN
        RAISE EXCEPTION 'Identificador de campo repetido: %', v_field_id;
      END IF;
      v_ids := array_append(v_ids, v_field_id);
      IF v_type = 'choice' AND (
        jsonb_typeof(v_field->'options') <> 'array'
        OR jsonb_array_length(v_field->'options') = 0
      ) THEN
        RAISE EXCEPTION 'Os campos de escolha necessitam de pelo menos uma opção';
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO public.obras_formularios_versoes (
    formulario_id, workspace_id, numero_versao, definicao, criado_por
  )
  VALUES (
    v_form.id,
    v_form.workspace_id,
    COALESCE((SELECT max(numero_versao) + 1
      FROM public.obras_formularios_versoes
      WHERE formulario_id = v_form.id), 1),
    p_definicao,
    auth.uid()
  )
  RETURNING * INTO v_version;

  UPDATE public.obras_formularios
  SET current_version_id = v_version.id,
      estado = 'activo',
      updated_at = clock_timestamp(),
      updated_by = auth.uid()
  WHERE id = v_form.id;

  RETURN v_version;
END;
$$;

-- A response is created from the current published version, never from a
-- client-supplied schema. Composite FKs enforce same-workspace relationships.
CREATE OR REPLACE FUNCTION public.criar_obras_formulario_resposta(
  p_formulario_id uuid,
  p_obra_id uuid,
  p_visita_id uuid,
  p_ocorrencia_id uuid DEFAULT NULL
)
RETURNS public.obras_formularios_respostas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form public.obras_formularios%ROWTYPE;
  v_version public.obras_formularios_versoes%ROWTYPE;
  v_workspace_id uuid;
  v_result public.obras_formularios_respostas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;
  SELECT * INTO v_form
  FROM public.obras_formularios
  WHERE id = p_formulario_id AND estado = 'activo';
  IF NOT FOUND OR NOT private.obras_can_write(v_form.workspace_id) THEN
    RAISE EXCEPTION 'Modelo não encontrado, inactivo ou sem permissões';
  END IF;
  SELECT * INTO v_version
  FROM public.obras_formularios_versoes
  WHERE id = v_form.current_version_id
    AND formulario_id = v_form.id
    AND workspace_id = v_form.workspace_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O modelo não tem uma versão publicada válida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.obras_visitas v
    WHERE v.id = p_visita_id AND v.obra_id = p_obra_id
      AND v.workspace_id = v_form.workspace_id
  ) THEN
    RAISE EXCEPTION 'A visita não pertence à obra e ao workspace seleccionados';
  END IF;
  IF p_ocorrencia_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.obras_ocorrencias o
    WHERE o.id = p_ocorrencia_id AND o.obra_id = p_obra_id
      AND o.workspace_id = v_form.workspace_id
      AND (o.visita_id IS NULL OR o.visita_id = p_visita_id)
  ) THEN
    RAISE EXCEPTION 'A ocorrência não pertence à visita e ao workspace seleccionados';
  END IF;

  INSERT INTO public.obras_formularios_respostas (
    workspace_id, obra_id, visita_id, ocorrencia_id, formulario_id,
    versao_id, definicao_snapshot, respostas, created_by, updated_by
  )
  VALUES (
    v_form.workspace_id, p_obra_id, p_visita_id, p_ocorrencia_id,
    v_form.id, v_version.id, v_version.definicao, '{}'::jsonb,
    auth.uid(), auth.uid()
  )
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

-- Completion validates mandatory values and attachment ownership on the server.
CREATE OR REPLACE FUNCTION public.concluir_obras_formulario_resposta(p_resposta_id uuid)
RETURNS public.obras_formularios_respostas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_response public.obras_formularios_respostas%ROWTYPE;
  v_section jsonb;
  v_field jsonb;
  v_value jsonb;
  v_option jsonb;
  v_photo_id uuid;
  v_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
  END IF;
  SELECT * INTO v_response
  FROM public.obras_formularios_respostas
  WHERE id = p_resposta_id
  FOR UPDATE;
  IF NOT FOUND OR NOT private.obras_can_write(v_response.workspace_id) THEN
    RAISE EXCEPTION 'Resposta não encontrada ou sem permissões';
  END IF;
  IF v_response.estado <> 'rascunho' THEN
    RAISE EXCEPTION 'A resposta já foi concluída';
  END IF;

  FOR v_section IN SELECT value FROM jsonb_array_elements(v_response.definicao_snapshot->'sections') LOOP
    FOR v_field IN SELECT value FROM jsonb_array_elements(v_section->'fields') LOOP
      v_value := v_response.respostas->(v_field->>'id');
      v_type := v_field->>'type';

      IF (v_field->>'required')::boolean THEN
        IF v_value IS NULL OR v_value = 'null'::jsonb
          OR (v_type IN ('text', 'date', 'choice') AND
              (jsonb_typeof(v_value) <> 'string' OR length(btrim(v_value #>> '{}')) = 0))
          OR (v_type IN ('attachment', 'photo') AND
              (jsonb_typeof(v_value) <> 'array' OR jsonb_array_length(v_value) = 0)) THEN
          RAISE EXCEPTION 'Campo obrigatório por preencher: %', v_field->>'label';
        END IF;
      END IF;

      IF v_value IS NULL OR v_value = 'null'::jsonb THEN
        CONTINUE;
      END IF;

      IF v_type = 'text' AND jsonb_typeof(v_value) <> 'string' THEN
        RAISE EXCEPTION 'O campo % tem de ser texto', v_field->>'label';
      ELSIF v_type = 'number' AND jsonb_typeof(v_value) <> 'number' THEN
        RAISE EXCEPTION 'O campo % tem de ser numérico', v_field->>'label';
      ELSIF v_type = 'date' AND jsonb_typeof(v_value) <> 'string' THEN
        RAISE EXCEPTION 'O campo % tem de conter uma data', v_field->>'label';
      ELSIF v_type = 'boolean' AND jsonb_typeof(v_value) <> 'boolean' THEN
        RAISE EXCEPTION 'O campo % tem de ser uma confirmação', v_field->>'label';
      ELSIF v_type = 'choice' THEN
        IF jsonb_typeof(v_value) <> 'string' OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_field->'options') opt
          WHERE opt.value = v_value
        ) THEN
          RAISE EXCEPTION 'A escolha do campo % não é válida', v_field->>'label';
        END IF;
      ELSIF v_type IN ('attachment', 'photo') THEN
        IF jsonb_typeof(v_value) <> 'array' THEN
          RAISE EXCEPTION 'Os anexos do campo % têm de ser uma lista de fotografias', v_field->>'label';
        END IF;
        FOR v_option IN SELECT value FROM jsonb_array_elements(v_value) LOOP
          BEGIN
            v_photo_id := (v_option #>> '{}')::uuid;
          EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Identificador de fotografia inválido no campo %', v_field->>'label';
          END;
          IF NOT EXISTS (
            SELECT 1 FROM public.obras_fotos f
            WHERE f.id = v_photo_id
              AND f.workspace_id = v_response.workspace_id
              AND (f.visita_id = v_response.visita_id OR
                   (v_response.ocorrencia_id IS NOT NULL AND f.ocorrencia_id = v_response.ocorrencia_id))
          ) THEN
            RAISE EXCEPTION 'Uma fotografia do campo % não pertence a esta visita ou ocorrência', v_field->>'label';
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.obras_formularios_respostas
  SET estado = 'concluido',
      completed_by = auth.uid(),
      completed_at = clock_timestamp(),
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  WHERE id = v_response.id
  RETURNING * INTO v_response;
  RETURN v_response;
END;
$$;

REVOKE ALL ON FUNCTION public.publicar_obras_formulario(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_obras_formulario_resposta(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.concluir_obras_formulario_resposta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_obras_formulario(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_obras_formulario_resposta(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.concluir_obras_formulario_resposta(uuid) TO authenticated;

COMMIT;
