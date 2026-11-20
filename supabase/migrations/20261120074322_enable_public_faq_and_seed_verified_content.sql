grant select on table public.fkt_support_faq to anon;
drop policy if exists fkt_support_faq_public_read on public.fkt_support_faq;
create policy fkt_support_faq_public_read on public.fkt_support_faq for select to anon using (is_published);
insert into public.fkt_support_faq (module,category,question,answer,is_published,sort_order,reviewed_at)
values
('core','Acesso','É possível consultar as perguntas frequentes sem iniciar sessão?','Sim. As FAQ publicadas podem ser consultadas e pesquisadas sem iniciar sessão. Para abrir e acompanhar pedidos de suporte é necessário entrar na plataforma.',true,10,now()),
('core','Suporte','Como posso pedir ajuda à equipa FKT?','Inicie sessão e abra «Ajuda e Suporte». Seleccione «Novo pedido», indique o módulo, a categoria, o assunto e descreva a questão. Depois poderá acompanhar o pedido e as respostas na mesma área.',true,20,now()),
('core','Privacidade','Posso consultar pedidos de suporte de outras pessoas?','Não. Cada utilizador pode consultar os seus próprios pedidos. A gestão global dos pedidos está reservada ao Administrador Global.',true,30,now()),
('works','Visitas e ocorrências','O que posso registar no FKT Works?','O módulo permite organizar obras, registar visitas e ocorrências, associar fotografias e notas e acompanhar acções de correcção com responsáveis, prazos e estados.',true,40,now()),
('works','Visitas','Tenho de completar a análise durante a visita?','Não. O fluxo documentado permite registar no terreno uma fotografia e uma nota curta. A análise estruturada, as referências e a decisão podem ser completadas posteriormente.',true,50,now()),
('lex','Processos','Para que serve o FKT Lex?','O FKT Lex organiza processos jurídicos em dossiers com factos, partes, documentos e prazos. Inclui uma estrutura de análise FIRAC e acompanhamento de prazos.',true,60,now()),
('lex','Dossiers','Tenho de associar um cliente a cada dossier?','Não. A associação de um cliente é opcional na criação de um dossier.',true,70,now()),
('lex','Limites','O FKT Lex presta aconselhamento jurídico?','Não. É uma ferramenta de organização factual e de apoio à estruturação de processos. Não substitui a análise nem o aconselhamento de um profissional habilitado.',true,80,now()),
('vet','Animais','Que informação posso organizar no FKT Vet?','O módulo centraliza fichas de animais, identificação, raça, microchip e histórico sanitário, incluindo registos de vacinas, desparasitações e tratamentos.',true,90,now()),
('vet','Alojamento','É possível gerir reservas de alojamento?','Sim. O módulo inclui gestão de reservas de alojamento, com datas de entrada e saída e organização de estadias.',true,100,now()),
('dev','Projectos','O que posso gerir no FKT Dev?','O FKT Dev permite organizar projectos, acompanhar issues e documentar decisões de arquitectura através de ADRs.',true,110,now()),
('dev','Integração','O FKT Dev substitui o GitHub Issues?','Não. O FKT Dev complementa o GitHub Issues, organizando também o contexto dos projectos e as decisões técnicas.',true,120,now())
on conflict do nothing;
