-- Issue #29: cross-module textual search.
-- SECURITY INVOKER is intentional: underlying table RLS policies remain authoritative.
CREATE OR REPLACE FUNCTION public.fkt_global_search(
  p_query text,
  p_module text DEFAULT NULL,
  p_record_type text DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL,
  p_obra_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  module text,
  record_type text,
  record_id uuid,
  title text,
  excerpt text,
  href text,
  created_at timestamptz,
  workspace_id uuid,
  obra_id uuid,
  status text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT '%' || left(trim(coalesce(p_query, '')), 200) || '%' AS pattern
  ),
  results AS (
    -- FKT Works: metadata and text fields only; uploaded binary files are not indexed.
    SELECT 'works'::text AS module, 'obra'::text AS record_type, o.id AS record_id,
      o.nome AS title, concat_ws(' · ', o.codigo, o.morada, o.dono_obra) AS excerpt,
      '/obras/' || o.id::text AS href, o.created_at, o.workspace_id, o.id AS obra_id, o.estado AS status
    FROM public.obras o CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'works') AND (p_record_type IS NULL OR p_record_type = 'obra')
      AND (p_workspace_id IS NULL OR o.workspace_id = p_workspace_id)
      AND (p_obra_id IS NULL OR o.id = p_obra_id)
      AND (p_date_from IS NULL OR o.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at::date <= p_date_to)
      AND (p_status IS NULL OR o.estado = p_status)
      AND concat_ws(' ', o.nome, o.codigo, o.morada, o.dono_obra) ILIKE q.pattern

    UNION ALL
    SELECT 'works', 'visita', v.id, concat('Visita · ', o.nome),
      concat_ws(' · ', v.tecnico, v.notas, v.condicoes_meteo, v.data_visita::text),
      '/obras/' || v.obra_id::text || '/visita/' || v.id::text, v.created_at, v.workspace_id, v.obra_id, NULL
    FROM public.obras_visitas v JOIN public.obras o ON o.id = v.obra_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'works') AND (p_record_type IS NULL OR p_record_type = 'visita')
      AND (p_workspace_id IS NULL OR v.workspace_id = p_workspace_id)
      AND (p_obra_id IS NULL OR v.obra_id = p_obra_id)
      AND p_status IS NULL
      AND (p_date_from IS NULL OR v.data_visita >= p_date_from)
      AND (p_date_to IS NULL OR v.data_visita <= p_date_to)
      AND concat_ws(' ', o.nome, v.tecnico, v.notas, v.condicoes_meteo) ILIKE q.pattern

    UNION ALL
    SELECT 'works', 'ocorrencia', oc.id, oc.titulo,
      concat_ws(' · ', o.nome, oc.descricao, oc.localizacao, oc.gravidade),
      '/obras/' || oc.obra_id::text || '/ocorrencia/' || oc.id::text, oc.created_at, oc.workspace_id, oc.obra_id, oc.estado
    FROM public.obras_ocorrencias oc JOIN public.obras o ON o.id = oc.obra_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'works') AND (p_record_type IS NULL OR p_record_type = 'ocorrencia')
      AND (p_workspace_id IS NULL OR oc.workspace_id = p_workspace_id)
      AND (p_obra_id IS NULL OR oc.obra_id = p_obra_id)
      AND (p_date_from IS NULL OR oc.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR oc.created_at::date <= p_date_to)
      AND (p_status IS NULL OR oc.estado = p_status)
      AND concat_ws(' ', o.nome, oc.titulo, oc.descricao, oc.localizacao, oc.gravidade) ILIKE q.pattern

    UNION ALL
    SELECT 'works', 'documento', d.id, d.titulo,
      concat_ws(' · ', d.categoria, d.entidade_origem, d.identificador, d.notas, v.nome_ficheiro),
      '/obras/' || d.obra_id::text, d.created_at, d.workspace_id, d.obra_id, NULL
    FROM public.obras_documentos d
    LEFT JOIN LATERAL (
      SELECT vv.nome_ficheiro FROM public.obras_documento_versoes vv
      WHERE vv.documento_id = d.id ORDER BY vv.numero_versao DESC LIMIT 1
    ) v ON true CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'works') AND (p_record_type IS NULL OR p_record_type = 'documento')
      AND (p_workspace_id IS NULL OR d.workspace_id = p_workspace_id)
      AND (p_obra_id IS NULL OR d.obra_id = p_obra_id)
      AND (p_date_from IS NULL OR d.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at::date <= p_date_to)
      AND p_status IS NULL
      AND concat_ws(' ', d.titulo, d.categoria, d.entidade_origem, d.identificador, d.notas, v.nome_ficheiro) ILIKE q.pattern

    UNION ALL
    SELECT 'works', 'analise', an.id, concat('Análise · ', oc.titulo),
      concat_ws(' · ', o.nome, an.interpretacao, an.conclusao, an.recomendacao, an.informacao_em_falta),
      '/obras/' || oc.obra_id::text || '/ocorrencia/' || oc.id::text,
      an.created_at, an.workspace_id, oc.obra_id, NULL
    FROM public.obras_ocorrencia_analises an
    JOIN public.obras_ocorrencias oc ON oc.id = an.ocorrencia_id
    JOIN public.obras o ON o.id = oc.obra_id
    CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'works') AND (p_record_type IS NULL OR p_record_type = 'analise')
      AND (p_workspace_id IS NULL OR an.workspace_id = p_workspace_id)
      AND (p_obra_id IS NULL OR oc.obra_id = p_obra_id)
      AND (p_date_from IS NULL OR an.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR an.created_at::date <= p_date_to)
      AND p_status IS NULL
      AND concat_ws(' ', o.nome, oc.titulo, an.interpretacao, an.conclusao, an.recomendacao, an.informacao_em_falta) ILIKE q.pattern

    -- FKT Lex: structured case records.
    UNION ALL
    SELECT 'lex', 'processo', p.id, p.titulo,
      concat_ws(' · ', p.referencia, p.numero_processo, p.tribunal, p.tipo, p.contexto, p.questao),
      '/juridico/' || p.id::text, p.created_at, p.workspace_id, NULL, p.estado
    FROM public.juridico_processos p CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'processo')
      AND (p_workspace_id IS NULL OR p.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR p.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR p.created_at::date <= p_date_to)
      AND (p_status IS NULL OR p.estado = p_status)
      AND concat_ws(' ', p.titulo, p.referencia, p.numero_processo, p.tribunal, p.tipo, p.contexto, p.questao) ILIKE q.pattern

    UNION ALL
    SELECT 'lex', 'facto', f.id, left(f.descricao, 140), concat_ws(' · ', p.titulo, f.estado, f.origem, f.notas),
      '/juridico/' || p.id::text, f.created_at, f.workspace_id, NULL, f.estado
    FROM public.juridico_factos f JOIN public.juridico_processos p ON p.id = f.processo_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'facto')
      AND (p_workspace_id IS NULL OR f.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR f.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR f.created_at::date <= p_date_to)
      AND (p_status IS NULL OR f.estado = p_status)
      AND concat_ws(' ', p.titulo, f.descricao, f.estado, f.origem, f.notas) ILIKE q.pattern

    UNION ALL
    SELECT 'lex', 'questao', j.id, j.titulo, concat_ws(' · ', p.titulo, j.pergunta, j.notas, j.estado),
      '/juridico/' || p.id::text, j.created_at, j.workspace_id, NULL, j.estado
    FROM public.juridico_questoes j JOIN public.juridico_processos p ON p.id = j.processo_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'questao')
      AND (p_workspace_id IS NULL OR j.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR j.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR j.created_at::date <= p_date_to)
      AND (p_status IS NULL OR j.estado = p_status)
      AND concat_ws(' ', p.titulo, j.titulo, j.pergunta, j.notas) ILIKE q.pattern

    UNION ALL
    SELECT 'lex', 'fonte', s.id, s.titulo, concat_ws(' · ', p.titulo, s.tipo, s.entidade, s.referencia, s.jurisdicao, s.notas),
      '/juridico/' || p.id::text, s.created_at, s.workspace_id, NULL, NULL
    FROM public.juridico_fontes s JOIN public.juridico_processos p ON p.id = s.processo_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'fonte')
      AND (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR s.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR s.created_at::date <= p_date_to)
      AND p_status IS NULL
      AND concat_ws(' ', p.titulo, s.titulo, s.tipo, s.entidade, s.referencia, s.jurisdicao, s.notas) ILIKE q.pattern

    UNION ALL
    SELECT 'lex', 'documento', doc.id, doc.nome,
      concat_ws(' · ', p.titulo, doc.categoria, doc.notas, doc.data_documento::text),
      '/juridico/' || p.id::text, doc.created_at, doc.workspace_id, NULL, NULL
    FROM public.juridico_documentos doc
    JOIN public.juridico_processos p ON p.id = doc.processo_id
    CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'documento')
      AND (p_workspace_id IS NULL OR doc.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR doc.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR doc.created_at::date <= p_date_to)
      AND p_status IS NULL
      AND concat_ws(' ', p.titulo, doc.nome, doc.categoria, doc.notas) ILIKE q.pattern


    UNION ALL
    SELECT 'lex', 'analise', a.id, concat('Análise · ', p.titulo),
      concat_ws(' · ', qst.titulo, a.raciocinio, a.argumentos_favoraveis, a.argumentos_contrarios, a.lacunas, a.pressupostos),
      '/juridico/' || p.id::text, a.created_at, a.workspace_id, NULL, a.estado
    FROM public.juridico_aplicacoes a
    JOIN public.juridico_processos p ON p.id = a.processo_id
    LEFT JOIN public.juridico_questoes qst ON qst.id = a.questao_id
    CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'lex') AND (p_record_type IS NULL OR p_record_type = 'analise')
      AND (p_workspace_id IS NULL OR a.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR a.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR a.created_at::date <= p_date_to)
      AND (p_status IS NULL OR a.estado = p_status)
      AND concat_ws(' ', p.titulo, qst.titulo, a.raciocinio, a.argumentos_favoraveis, a.argumentos_contrarios, a.lacunas, a.pressupostos) ILIKE q.pattern

    -- FKT Vet.
    UNION ALL
    SELECT 'vet', 'animal', a.id, a.nome,
      concat_ws(' · ', a.raca, a.numero_chip, a.numero_lop, a.proprietario_nome, a.observacoes),
      '/canil/animal/' || a.id::text, a.created_at, a.workspace_id, NULL, CASE WHEN a.activo THEN 'activo' ELSE 'arquivado' END
    FROM public.canil_animais a CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'vet') AND (p_record_type IS NULL OR p_record_type = 'animal')
      AND (p_workspace_id IS NULL OR a.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR a.created_at::date >= p_date_from)
      AND (p_status IS NULL OR (CASE WHEN a.activo THEN 'activo' ELSE 'arquivado' END) = p_status)
      AND (p_date_to IS NULL OR a.created_at::date <= p_date_to)
      AND concat_ws(' ', a.nome, a.raca, a.numero_chip, a.numero_lop, a.proprietario_nome, a.observacoes) ILIKE q.pattern

    UNION ALL
    SELECT 'vet', 'registo_clinico', c.id, concat('Registo clínico · ', a.nome),
      concat_ws(' · ', c.tipo, c.descricao, c.produto, c.veterinario),
      '/canil/animal/' || a.id::text, c.created_at, c.workspace_id, NULL, NULL
    FROM public.canil_registos_clinicos c JOIN public.canil_animais a ON a.id = c.animal_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'vet') AND (p_record_type IS NULL OR p_record_type = 'registo_clinico')
      AND (p_workspace_id IS NULL OR c.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR c.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR c.created_at::date <= p_date_to)
      AND p_status IS NULL
      AND concat_ws(' ', a.nome, c.tipo, c.descricao, c.produto, c.veterinario) ILIKE q.pattern

    UNION ALL
    -- FKT Dev.
    SELECT 'dev', 'projecto', d.id, d.nome, concat_ws(' · ', d.descricao, d.stack, d.versao_actual),
      '/dev/projecto/' || d.id::text, d.created_at, d.workspace_id, NULL, d.estado
    FROM public.dev_projectos d CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'dev') AND (p_record_type IS NULL OR p_record_type = 'projecto')
      AND (p_workspace_id IS NULL OR d.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR d.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at::date <= p_date_to)
      AND (p_status IS NULL OR d.estado = p_status)
      AND concat_ws(' ', d.nome, d.descricao, array_to_string(d.stack, ' '), d.versao_actual) ILIKE q.pattern

    UNION ALL
    SELECT 'dev', 'issue', i.id, i.titulo, concat_ws(' · ', d.nome, i.descricao, i.tipo, i.prioridade),
      '/dev/projecto/' || d.id::text, i.created_at, i.workspace_id, NULL, i.estado
    FROM public.dev_issues i JOIN public.dev_projectos d ON d.id = i.projecto_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'dev') AND (p_record_type IS NULL OR p_record_type = 'issue')
      AND (p_workspace_id IS NULL OR i.workspace_id = p_workspace_id) AND p_obra_id IS NULL
      AND (p_date_from IS NULL OR i.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR i.created_at::date <= p_date_to)
      AND (p_status IS NULL OR i.estado = p_status)
      AND concat_ws(' ', d.nome, i.titulo, i.descricao, i.tipo, i.prioridade, i.milestone) ILIKE q.pattern

    UNION ALL
    -- Personal knowledge and legacy dossiers, each protected by its own RLS policies.
    SELECT 'core', 'disciplina', d.id, d.nome, d.descricao,
      '/conhecimento/disciplinas/' || d.id::text, d.created_at, NULL::uuid, NULL::uuid, NULL::text
    FROM public.disciplinas d CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'core') AND (p_record_type IS NULL OR p_record_type = 'disciplina')
      AND (p_date_from IS NULL OR d.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at::date <= p_date_to)
      AND p_workspace_id IS NULL AND p_obra_id IS NULL AND p_status IS NULL
      AND concat_ws(' ', d.nome, d.descricao) ILIKE q.pattern

    UNION ALL
    SELECT 'core', 'topico', t.id, t.nome, concat_ws(' · ', d.nome, t.conteudo, t.referencias),
      '/conhecimento/disciplinas/' || d.id::text, t.created_at, NULL::uuid, NULL::uuid, NULL::text
    FROM public.topicos t JOIN public.disciplinas d ON d.id = t.disciplina_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'core') AND (p_record_type IS NULL OR p_record_type = 'topico')
      AND (p_date_from IS NULL OR t.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at::date <= p_date_to)
      AND p_workspace_id IS NULL AND p_obra_id IS NULL AND p_status IS NULL
      AND concat_ws(' ', d.nome, t.nome, t.conteudo, t.referencias) ILIKE q.pattern

    UNION ALL
    SELECT 'core', 'dossier', d.id, d.titulo, concat_ws(' · ', d.tipo, d.estado, d.materia, d.descricao),
      '/dossiers/' || d.id::text, d.created_at, NULL::uuid, NULL::uuid, d.estado
    FROM public.dossiers d CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'core') AND (p_record_type IS NULL OR p_record_type = 'dossier')
      AND (p_date_from IS NULL OR d.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR d.created_at::date <= p_date_to)
      AND (p_status IS NULL OR d.estado = p_status)
      AND p_workspace_id IS NULL AND p_obra_id IS NULL
      AND concat_ws(' ', d.titulo, d.tipo, d.estado, d.materia, d.descricao) ILIKE q.pattern

    UNION ALL
    SELECT 'core', 'documento', doc.id, doc.titulo, concat_ws(' · ', doc.tipo, doc.entidade_origem, doc.descricao),
      '/dossiers/' || doc.dossier_id::text, doc.created_at, NULL::uuid, NULL::uuid, NULL::text
    FROM public.documentos doc CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'core') AND (p_record_type IS NULL OR p_record_type = 'documento')
      AND (p_date_from IS NULL OR doc.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR doc.created_at::date <= p_date_to)
      AND p_workspace_id IS NULL AND p_obra_id IS NULL AND p_status IS NULL
      AND concat_ws(' ', doc.titulo, doc.tipo, doc.entidade_origem, doc.descricao) ILIKE q.pattern

    UNION ALL
    SELECT 'core', 'facto', f.id, left(f.descricao, 140), concat_ws(' · ', d.titulo, f.grau_certeza, f.observacoes),
      '/dossiers/' || d.id::text, f.created_at, NULL::uuid, NULL::uuid, f.grau_certeza
    FROM public.factos f JOIN public.dossiers d ON d.id = f.dossier_id CROSS JOIN q
    WHERE (p_module IS NULL OR p_module = 'core') AND (p_record_type IS NULL OR p_record_type = 'facto')
      AND (p_date_from IS NULL OR f.created_at::date >= p_date_from)
      AND (p_date_to IS NULL OR f.created_at::date <= p_date_to)
      AND p_workspace_id IS NULL AND p_obra_id IS NULL AND p_status IS NULL
      AND concat_ws(' ', d.titulo, f.descricao, f.grau_certeza, f.observacoes) ILIKE q.pattern
  )
  SELECT r.module, r.record_type, r.record_id, r.title, left(coalesce(r.excerpt, ''), 320),
    r.href, r.created_at, r.workspace_id, r.obra_id, r.status
  FROM results r
  WHERE length(trim(coalesce(p_query, ''))) >= 2
  ORDER BY r.created_at DESC NULLS LAST
  LIMIT greatest(1, least(coalesce(p_limit, 30), 100));
$$;

REVOKE ALL ON FUNCTION public.fkt_global_search(text,text,text,uuid,uuid,date,date,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fkt_global_search(text,text,text,uuid,uuid,date,date,text,integer) TO authenticated;
