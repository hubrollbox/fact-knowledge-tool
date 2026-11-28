-- Expand the public help centre with workflow-specific, code-verified FKT guidance.
-- Idempotent: existing FAQ entries are updated by their stable module/category/question key;
-- new entries are inserted only when the exact question is not already present.

update public.fkt_support_faq
set question = 'Como registo um cliente ou outro interveniente num processo?',
    answer = 'Abra o FKT Lex e entre no processo pretendido. No detalhe do processo, abra o separador «Partes» e escolha «Adicionar parte». Indique o nome e o tipo de interveniente (por exemplo, cliente, contraparte, testemunha ou perito). NIF, contacto, mandatário e notas são campos adicionais.',
    reviewed_at = now()
where module = 'lex'
  and category = 'Dossiers'
  and question = 'Tenho de associar um cliente a cada dossier?';

insert into public.fkt_support_faq
  (module, category, question, answer, is_published, sort_order, reviewed_at)
select v.module, v.category, v.question, v.answer, true, v.sort_order, now()
from (values
  ('core','Ajuda e Suporte','Onde encontro a Ajuda e Suporte?','Depois de entrar na plataforma, abra «Ajuda e Suporte» no menu lateral. A área é comum a todos os módulos. Pode consultar as perguntas frequentes, pesquisar por palavras e filtrar pelo módulo.',130),
  ('core','Ajuda e Suporte','Posso consultar as FAQ sem iniciar sessão?','Sim. As perguntas frequentes publicadas podem ser consultadas sem iniciar sessão. Para criar e acompanhar pedidos de suporte é necessário entrar na plataforma.',140),
  ('core','Pedidos de suporte','Como acompanho um pedido de suporte?','Inicie sessão, abra «Ajuda e Suporte» e entre em «Os meus pedidos». Seleccione o pedido para consultar o estado, o histórico e as mensagens. Os estados apresentados incluem Aberto, Em análise, A aguardar resposta e Resolvido.',150),
  ('core','Pedidos de suporte','Que informação devo incluir num pedido de suporte?','Escolha o módulo a que a questão diz respeito, indique uma categoria e escreva um assunto claro. Na descrição, explique o que estava a tentar fazer, os passos seguidos e o resultado obtido. Se necessário, pode juntar ficheiros; cada anexo tem um limite de 10 MB.',160),

  ('works','Obras','Como crio uma obra no FKT Works?','Abra «FKT Works» no menu lateral e entre em «Obras». Escolha «Nova obra». O nome é obrigatório. Pode ainda preencher código, dono de obra, morada, data de início e data prevista de conclusão. Termine em «Criar obra».',170),
  ('works','Obras','Como entro no detalhe de uma obra?','No FKT Works, abra «Obras» e seleccione o cartão da obra pretendida. O detalhe apresenta as secções «Diário», «Ocorrências», «Ações», «Planeamento» e «Documentos».',180),
  ('works','Diário','Onde encontro o Diário de uma obra?','Abra «FKT Works» > «Obras» e seleccione a obra. No detalhe, o primeiro separador chama-se «Diário». É aí que consulta os registos e utiliza os filtros. Não existe um separador com o nome «Visitas» nesta vista.',190),
  ('works','Relatórios','Como gero o relatório do Diário em PDF?','Abra «FKT Works» > «Obras» e seleccione a obra. No detalhe, permaneça no separador «Diário» e escolha «Relatório do período», no topo da lista. Na página do relatório, escolha «Imprimir / Guardar PDF». Na janela de impressão do dispositivo, seleccione a opção para guardar como PDF, se estiver disponível.',200),
  ('works','Ocorrências','Como consulto uma ocorrência?','Abra «FKT Works» > «Obras», seleccione a obra e entre no separador «Ocorrências». Escolha a ocorrência pretendida para abrir o respectivo detalhe. Aí pode consultar a evidência fotográfica, factos e análise, classificação, documentos associados, acções e histórico.',210),
  ('works','Ações','Onde vejo as ações pendentes?','No ecrã «Obras» do FKT Works, utilize «Fila de ações», na área «Acompanhamento operacional». Também pode consultar as ações associadas a uma obra no separador «Ações» do detalhe dessa obra.',220),
  ('works','Formulários','Onde crio um modelo de formulário?','No FKT Works, abra «Obras» e escolha «Modelos de formulários», na área «Acompanhamento operacional». Seleccione «Novo modelo», indique o nome, tipo e estrutura, e adicione secções e campos. Pode guardar como rascunho ou publicar a versão.',230),

  ('lex','Processos','Como crio um processo no FKT Lex?','Abra «FKT Lex» no menu lateral. No ecrã «Processos», escolha «Novo processo». Preencha o título obrigatório e, se aplicável, o tipo e o tribunal. Termine em «Criar».',240),
  ('lex','Processos','Que separadores encontro no detalhe de um processo?','Abra «FKT Lex» > «Processos» e seleccione um processo. O detalhe apresenta «Resumo», «Factos», «Questões», «Fontes», «Aplicação», «Conclusões», «Partes», «Documentos» e «Prazos».',250),
  ('lex','Análise FIRAC','Como organizo os factos e as questões jurídicas?','No detalhe do processo, utilize «Factos» para registar factos e o respectivo estado de validação. Em «Questões», registe as perguntas jurídicas e associe-lhes factos e fontes. Em «Fontes», registe legislação, jurisprudência, doutrina ou outras referências. Em «Aplicação», documente o raciocínio e os argumentos. As «Conclusões» têm fluxo de rascunho, revisão e aprovação.',260),
  ('lex','Relatórios','Como gero o relatório de um processo?','Abra o processo no FKT Lex e escolha «Relatório PDF», no cabeçalho do detalhe. Na página do relatório, escolha «Imprimir / Guardar PDF» e, na janela de impressão, seleccione a opção de guardar em PDF.',270),

  ('vet','Animais','Como registo um animal no FKT Vet?','Abra «FKT Vet» no menu lateral. No ecrã «Canil», escolha a opção para criar um novo animal. Preencha o nome (obrigatório) e, se aplicável, raça, sexo, data de nascimento, número de chip, número LOP, proprietário, contacto e observações. Termine em «Criar».',280),
  ('vet','Ficha do animal','Que informação encontro na ficha de um animal?','Na página «Canil», seleccione o animal. A ficha apresenta os separadores «Ficha», «Historial clínico» e «Ninhadas». Os dados de identificação incluem, entre outros, nome, raça, sexo, data de nascimento, número de chip, número LOP e dados do proprietário.',290),
  ('vet','Historial clínico','Como adiciono um registo clínico?','Abra «FKT Vet» > «Canil», seleccione o animal e entre em «Historial clínico». Escolha a opção para adicionar um registo. O formulário permite indicar tipo, descrição, data, próxima data, produto, veterinário e custo.',300),
  ('vet','Reservas e agenda','Como registo uma reserva de alojamento?','No FKT Vet, abra a opção «Nova reserva». Seleccione o animal e indique as datas de entrada e saída. Pode ainda preencher box, preço por dia e instruções. Depois de criar a reserva, a aplicação encaminha-o para «Agenda diária».',310),

  ('dev','Projectos','Como crio um projecto no FKT Dev?','Abra «FKT Dev» no menu lateral e escolha «Novo projecto». Indique o nome. Pode acrescentar descrição, URL do repositório, URL da documentação, URL de deploy, versão actual e tecnologias da stack. Os endereços, quando preenchidos, têm de começar por http:// ou https://.',320),
  ('dev','Projectos','Como consulto a informação de um projecto?','No FKT Dev, seleccione um projecto na lista de projectos activos. O detalhe apresenta os separadores «Projecto», «Issues», «ADRs» e «Contribuidores». Em «Projecto» pode consultar as ligações, versão e stack registadas.',330),
  ('dev','ADRs','Como registo uma decisão de arquitectura (ADR)?','Abra um projecto no FKT Dev, entre em «ADRs» e escolha «Novo ADR». Indique um título e registe o contexto, problema, alternativas, análise e decisão. Termine em «Guardar ADR».',340),
  ('dev','Issues','Que filtros existem para as issues de um projecto?','No detalhe do projecto, abra «Issues». Pode filtrar por tipo (bug, feature, decisão, discussão ou outro), prioridade (crítica, alta, média ou baixa) e estado (aberto, em progresso, resolvido ou fechado).',350)
) as v(module, category, question, answer, sort_order)
where not exists (
  select 1
  from public.fkt_support_faq existing
  where existing.module = v.module
    and existing.question = v.question
);
