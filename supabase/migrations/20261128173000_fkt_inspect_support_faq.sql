-- Add FKT Inspect to the public help centre and support ticket module scope.
-- Content is deliberately limited to capabilities and status verified in the repository.

ALTER TABLE public.fkt_support_faq
  DROP CONSTRAINT IF EXISTS fkt_support_faq_module_check;
ALTER TABLE public.fkt_support_faq
  ADD CONSTRAINT fkt_support_faq_module_check
  CHECK (module IN ('core', 'works', 'lex', 'vet', 'dev', 'inspect'));

ALTER TABLE public.fkt_support_tickets
  DROP CONSTRAINT IF EXISTS fkt_support_tickets_module_check;
ALTER TABLE public.fkt_support_tickets
  ADD CONSTRAINT fkt_support_tickets_module_check
  CHECK (module IN ('core', 'works', 'lex', 'vet', 'dev', 'inspect'));

INSERT INTO public.fkt_support_faq
  (module, category, question, answer, is_published, sort_order, reviewed_at)
SELECT 'inspect', v.category, v.question, v.answer, true, v.sort_order, now()
FROM (VALUES
  ('Estado do módulo', 'O FKT Inspect já está disponível?', 'Ainda não. A fundação de dados e a primeira interface de gestão de clientes e estabelecimentos estão no repositório e passaram os testes automatizados de CI. A migração ainda não foi aplicada à base de dados de produção e o fluxo de activação não está concluído.', 10),
  ('Âmbito', 'Qual é a primeira área de aplicação?', 'O primeiro âmbito é segurança alimentar e higiene em estabelecimentos de restauração e preparação de refeições. A expansão para outros sectores exige análise e validação próprias.', 20),
  ('Utilizadores', 'A quem se destina o FKT Inspect?', 'A concepção contempla consultores e auditores que acompanham vários clientes, bem como empresas e operadores que pretendem realizar controlos internos nos seus próprios estabelecimentos.', 30),
  ('Auditorias', 'Que trabalho pretende apoiar?', 'O âmbito previsto inclui auditorias com critérios definidos, registo de observações e medições, recolha de evidências, identificação de não conformidades, acompanhamento de acções correctivas e relatórios com histórico. Estas capacidades ainda não estão disponíveis para utilização.', 40),
  ('HACCP e responsabilidade', 'O FKT Inspect substitui um plano HACCP ou uma auditoria oficial?', 'Não. O FKT Inspect pretende apoiar a organização e rastreabilidade do trabalho. Não substitui a responsabilidade do operador alimentar, a análise de perigos específica, o aconselhamento técnico, a fiscalização oficial ou a certificação.', 50),
  ('Conformidade', 'O módulo determina automaticamente se um estabelecimento cumpre a lei?', 'Não. Os critérios e limites aplicáveis terão de estar associados às fontes e versões relevantes e ser validados por profissionais competentes. A ferramenta não garante conformidade legal automática.', 60),
  ('Carteira', 'É possível gerir vários clientes e estabelecimentos?', 'A gestão de uma carteira de clientes e estabelecimentos faz parte da primeira etapa técnica. A interface já existe no código, mas não está disponível na aplicação de produção enquanto a migração e o fluxo de activação não estiverem concluídos.', 70)
) AS v(category, question, answer, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fkt_support_faq existing
  WHERE existing.module = 'inspect' AND existing.question = v.question
);

