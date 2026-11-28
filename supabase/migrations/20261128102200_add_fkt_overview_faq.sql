insert into public.fkt_support_faq
  (module, category, question, answer, is_published, sort_order, reviewed_at)
select 'core', 'Conhecer o FKT', v.question, v.answer, true, v.sort_order, now()
from (values
  ('O que é o FKT?','O FKT é uma plataforma única para organizar informação, registos, referências, decisões e acompanhamento de trabalho. O seu núcleo comum assegura estrutura, contexto e histórico; os módulos especializados adaptam a plataforma a diferentes actividades.',10),
  ('Como estão organizadas as ferramentas do FKT?','O FKT funciona como uma plataforma integrada, não como aplicações independentes. Existe uma conta e um espaço de trabalho principal; os módulos disponíveis são activados conforme as necessidades da organização. Cada módulo acrescenta ferramentas próprias, mantendo a base comum de informação e organização.',20)
) as v(question, answer, sort_order)
where not exists (
  select 1 from public.fkt_support_faq f
  where f.module = 'core' and f.question = v.question
);
