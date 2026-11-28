-- Keep the public FKT Lex help aligned with the immutable conclusion lifecycle.
-- This documents the lifecycle implemented by migration 20261120145052.
UPDATE public.fkt_support_faq
SET answer = 'Cada conclusão é guardada como uma versão imutável. Uma nova versão começa em «Rascunho»; pode ser submetida para revisão, devolvida para correcção ou aprovada como final. Uma conclusão final pode ser reaberta através da transição prevista no fluxo. Para alterar o texto, crie uma nova versão em vez de editar a anterior. As transições ficam registadas no histórico. Este histórico de estados não deve ser confundido com a captura automática do contexto analítico, que depende de uma migração adicional ainda não aplicada à base de dados consultada em 28-11-2026.',
    reviewed_at = now()
WHERE module = 'lex'
  AND question = 'Como organizo os factos e as questões jurídicas?';

INSERT INTO public.fkt_support_faq
  (module, category, question, answer, is_published, sort_order, reviewed_at)
SELECT
  'lex',
  'Conclusões',
  'Como funciona o versionamento das conclusões?',
  'Cada conclusão é guardada como uma versão imutável. Uma nova versão começa em «Rascunho»; pode ser submetida para revisão, devolvida para correcção ou aprovada como final. Uma conclusão final pode ser reaberta através da transição prevista no fluxo. Para alterar o texto, crie uma nova versão em vez de editar a anterior. As transições ficam registadas no histórico. A captura automática do contexto analítico associado à versão depende de uma migração adicional e ainda não deve ser considerada disponível.',
  true,
  275,
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fkt_support_faq
  WHERE module = 'lex'
    AND question = 'Como funciona o versionamento das conclusões?'
);
