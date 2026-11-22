-- FKT Works #38: publish the saved draft atomically.
-- Prevents a stale client payload or a second editor from replacing a newer draft
-- between the publication RPC and the subsequent client-side draft cleanup.

BEGIN;

CREATE OR REPLACE FUNCTION private_works_forms.obras_publicar_formulario_draft_privileged(
  p_formulario_id uuid
)
RETURNS public.obras_formularios_versoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form public.obras_formularios%ROWTYPE;
  v_version public.obras_formularios_versoes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário iniciar sessão';
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
  IF v_form.draft_definicao IS NULL THEN
    RAISE EXCEPTION 'Não existe um rascunho guardado para publicar';
  END IF;

  -- The existing validator creates the immutable version and updates the
  -- current version pointer. It receives the draft read under this row lock.
  SELECT * INTO v_version
  FROM private_works_forms.obras_publicar_formulario_privileged(
    p_formulario_id,
    v_form.draft_definicao
  );

  UPDATE public.obras_formularios
  SET draft_definicao = NULL,
      updated_at = clock_timestamp(),
      updated_by = auth.uid()
  WHERE id = p_formulario_id;

  RETURN v_version;
END;
$$;

-- Authenticated clients must not be able to publish an arbitrary JSON
-- definition by calling the lower-level privileged helper directly.
REVOKE ALL ON FUNCTION private_works_forms.obras_publicar_formulario_privileged(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private_works_forms.obras_publicar_formulario_draft_privileged(uuid)
  TO authenticated;

DROP FUNCTION IF EXISTS public.publicar_obras_formulario(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.publicar_obras_formulario(p_formulario_id uuid)
RETURNS public.obras_formularios_versoes
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private_works_forms.obras_publicar_formulario_draft_privileged(p_formulario_id);
$$;

REVOKE ALL ON FUNCTION public.publicar_obras_formulario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publicar_obras_formulario(uuid) TO authenticated;

COMMIT;
