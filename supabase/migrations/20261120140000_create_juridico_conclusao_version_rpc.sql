-- Aloca versões de conclusão de forma atómica por processo e questão jurídica.
-- O bloqueio transaccional impede que pedidos concorrentes recebam a mesma versão.
CREATE OR REPLACE FUNCTION public.create_juridico_conclusao_version(
  _processo_id uuid,
  _workspace_id uuid,
  _questao_id uuid DEFAULT NULL,
  _aplicacao_id uuid DEFAULT NULL,
  _texto text DEFAULT NULL,
  _estado text DEFAULT 'rascunho'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _next_version integer;
  _conclusao_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '42501';
  END IF;

  IF NOT public.workspace_can_write(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissões para criar conclusões neste workspace' USING ERRCODE = '42501';
  END IF;

  IF _texto IS NULL OR btrim(_texto) = '' THEN
    RAISE EXCEPTION 'O texto da conclusão é obrigatório' USING ERRCODE = '22023';
  END IF;

  IF _estado NOT IN ('rascunho', 'revista', 'final') THEN
    RAISE EXCEPTION 'Estado de conclusão inválido' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      _processo_id::text || ':' || COALESCE(_questao_id::text, 'processo'),
      0
    )
  );

  SELECT COALESCE(MAX(versao), 0) + 1
    INTO _next_version
    FROM public.juridico_conclusoes
   WHERE processo_id = _processo_id
     AND workspace_id = _workspace_id
     AND questao_id IS NOT DISTINCT FROM _questao_id;

  INSERT INTO public.juridico_conclusoes (
    processo_id, workspace_id, questao_id, aplicacao_id,
    versao, texto, estado, autor_id
  )
  VALUES (
    _processo_id, _workspace_id, _questao_id, _aplicacao_id,
    _next_version, btrim(_texto), _estado, auth.uid()
  )
  RETURNING id INTO _conclusao_id;

  RETURN _conclusao_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_juridico_conclusao_version(uuid, uuid, uuid, uuid, text, text) TO authenticated;
