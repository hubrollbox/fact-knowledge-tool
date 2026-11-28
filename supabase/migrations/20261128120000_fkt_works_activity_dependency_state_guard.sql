-- Issue #44: reject adding unfinished predecessors to activities already underway/completed.
BEGIN;

CREATE OR REPLACE FUNCTION private.validar_obras_actividade_dependencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  creates_cycle boolean;
  activity_state text;
  predecessor_state text;
BEGIN
  IF NEW.actividade_id = NEW.depende_de_id THEN
    RAISE EXCEPTION 'Uma actividade não pode depender de si própria' USING ERRCODE = '23514';
  END IF;

  SELECT estado INTO activity_state
  FROM public.obras_actividades
  WHERE id = NEW.actividade_id
    AND workspace_id = NEW.workspace_id
    AND obra_id = NEW.obra_id;

  SELECT estado INTO predecessor_state
  FROM public.obras_actividades
  WHERE id = NEW.depende_de_id
    AND workspace_id = NEW.workspace_id
    AND obra_id = NEW.obra_id;

  IF activity_state IN ('em_curso', 'concluida')
     AND predecessor_state IS DISTINCT FROM 'concluida' THEN
    RAISE EXCEPTION 'Não é possível adicionar uma dependência por concluir a uma actividade em curso ou concluída'
      USING ERRCODE = '23514';
  END IF;

  WITH RECURSIVE reachable(id) AS (
    SELECT d.depende_de_id
    FROM public.obras_actividades_dependencias d
    WHERE d.actividade_id = NEW.depende_de_id
      AND d.workspace_id = NEW.workspace_id
      AND d.obra_id = NEW.obra_id
    UNION
    SELECT d.depende_de_id
    FROM public.obras_actividades_dependencias d
    JOIN reachable r ON d.actividade_id = r.id
    WHERE d.workspace_id = NEW.workspace_id
      AND d.obra_id = NEW.obra_id
  )
  SELECT EXISTS (SELECT 1 FROM reachable WHERE id = NEW.actividade_id)
  INTO creates_cycle;

  IF creates_cycle THEN
    RAISE EXCEPTION 'Esta dependência criaria um ciclo no planeamento' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validar_obras_actividade_dependencia() FROM PUBLIC, anon, authenticated;

COMMIT;
