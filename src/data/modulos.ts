import { Modulo } from '@/types/modulos';

export const modulos: Modulo[] = [
  {
    slug: 'obras',
    nome: 'FKT Works',
    descricao: 'Visitas, ocorrências e ações de fiscalização',
    icone: 'HardHat',
    destaque: 'Piloto fechado',
    tagline: 'Registo de visitas, ocorrências e acompanhamento de ações de fiscalização.',
    rotaPrincipal: '/obras',
    descricaoLonga: [
      'O técnico regista os factos no momento, associa fotografias e notas à visita e completa a análise posteriormente. As decisões e ações ficam organizadas, com responsáveis e prazos.',
      'Pensado para fiscais de obra independentes e pequenas empresas de fiscalização. Não é um ERP nem gere toda a obra: é uma camada simples de evidência, decisão e seguimento.',
    ],
    funcionalidades: [
      { icone: 'Building2', titulo: 'Obras', descricao: 'Nome, morada, cliente e responsável, com histórico de visitas.' },
      { icone: 'ClipboardList', titulo: 'Visitas de obra', descricao: 'Data, hora, notas gerais e localização quando autorizada.' },
      { icone: 'Camera', titulo: 'Ocorrências com fotografia', descricao: 'Captura rápida no telemóvel: foto, nota curta e prioridade.' },
      { icone: 'GitBranch', titulo: 'Análise estruturada', descricao: 'Contexto, problema, referências, análise e decisão — completáveis no escritório.' },
      { icone: 'ListChecks', titulo: 'Ações e prazos', descricao: 'Correções com responsável, prazo e estado até ao fecho.' },
    ],
    fluxo: [
      { titulo: 'Cria a obra', descricao: 'Identifica a obra, o cliente e a morada.' },
      { titulo: 'Regista a visita', descricao: 'Data e hora guardadas automaticamente.' },
      { titulo: 'Adiciona ocorrências', descricao: 'Fotografia, descrição curta, prioridade e estado.' },
      { titulo: 'Completa a decisão', descricao: 'Referências, análise e ação corretiva com prazo.' },
      { titulo: 'Acompanha as ações', descricao: 'Consulta responsáveis, prazos e estado das ações registadas.' },
    ],
    faq: [
      { q: 'Para quem é?', a: 'Fiscais de obra, diretores de obra, técnicos de qualidade e empresas de remodelação.' },
      { q: 'Tenho de preencher tudo em obra?', a: 'Não. No terreno basta a fotografia e uma nota; a análise pode ser completada mais tarde.' },
      { q: 'A localização é certificada?', a: 'Não. É um registo de localização e hora, guardado apenas com a tua autorização.' },
      { q: 'Já posso usar?', a: 'O módulo está em fase de piloto com um grupo restrito de utilizadores.' },
      { q: 'O FKT Works já permite criar e importar orçamentos?', a: 'A orçamentação está planeada para uma evolução futura do módulo. O âmbito em definição prevê criar orçamentos de raiz, importar ficheiros Excel e PDF com validação antes de gravar, gerir versões e acompanhar medições. Estas funcionalidades ainda não estão disponíveis.' },
    ],
  },
  {
    slug: 'juridico',
    nome: 'FKT Lex',
    descricao: 'Processos, documentos e prazos',
    icone: 'Scale',
    tagline: 'Organiza processos, prazos e documentos com rigor.',
    rotaPrincipal: '/juridico',
    descricaoLonga: [
      'O FKT Lex ajuda a estruturar cada processo num dossier completo, com partes, factos, documentos e prazos sempre acessíveis.',
      'Pensado para quem precisa de rastreabilidade total — cada decisão fica justificada por factos e referências.',
    ],
    funcionalidades: [
      { icone: 'FolderKanban', titulo: 'Processos estruturados', descricao: 'Cada processo num dossier com factos, partes e documentos.' },
      { icone: 'Clock', titulo: 'Controlo de prazos', descricao: 'Alertas visuais para prazos críticos (vermelho <3d, amarelo <7d).' },
      { icone: 'FileText', titulo: 'Documentos centralizados', descricao: 'Upload privado, URLs assinados, 50MB por ficheiro.' },
      { icone: 'GitBranch', titulo: 'FIRAC integrado', descricao: 'Análise jurídica estruturada por issue, com factos e conclusões.' },
      { icone: 'Users', titulo: 'Clientes e partes', descricao: 'Liga processos a clientes ou mantém-nos isolados.' },
      { icone: 'Printer', titulo: 'Relatórios imprimíveis', descricao: 'Exportação otimizada para impressão (Ctrl+P).' },
    ],
    fluxo: [
      { titulo: 'Cria o dossier', descricao: 'Define título, assunto e cliente (opcional).' },
      { titulo: 'Adiciona factos e documentos', descricao: 'Carrega ficheiros e regista factos relevantes.' },
      { titulo: 'Estrutura o FIRAC', descricao: 'Define issues, regras e aplicações ligadas a factos.' },
      { titulo: 'Acompanha prazos', descricao: 'Usa o Planner para próximas ações e prazos.' },
      { titulo: 'Conclui e arquiva', descricao: 'Fecha conclusões, exporta relatório, arquiva.' },
    ],
    faq: [
      { q: 'Posso usar sem clientes?', a: 'Sim. O cliente é opcional em cada dossier.' },
      { q: 'É um produto de aconselhamento jurídico?', a: 'Não. É uma ferramenta de organização factual. Não substitui advogados.' },
    ],
  },
  {
    slug: 'canil',
    nome: 'FKT Vet',
    descricao: 'Animais, ninhadas e alojamento',
    icone: 'Dog',
    tagline: 'Gere animais, ninhadas e reservas de alojamento.',
    rotaPrincipal: '/canil',
    descricaoLonga: [
      'O FKT Vet centraliza fichas de animais, registos sanitários, ninhadas e reservas de alojamento.',
      'Ideal para canis, criadores e clínicas que precisam de histórico claro por animal.',
    ],
    funcionalidades: [
      { icone: 'Dog', titulo: 'Fichas de animais', descricao: 'Identificação, raça, microchip, histórico sanitário.' },
      { icone: 'CalendarDays', titulo: 'Agenda diária', descricao: 'Vista rápida de tarefas, consultas e tratamentos.' },
      { icone: 'Heart', titulo: 'Ninhadas', descricao: 'Acompanha gestações, partos e crias.' },
      { icone: 'BedDouble', titulo: 'Reservas de alojamento', descricao: 'Gestão de boxes e estadias.' },
      { icone: 'Syringe', titulo: 'Registos sanitários', descricao: 'Vacinas, desparasitações e tratamentos.' },
      { icone: 'FileText', titulo: 'Documentos por animal', descricao: 'Anexa exames, receitas e certificados.' },
    ],
    fluxo: [
      { titulo: 'Regista o animal', descricao: 'Cria a ficha com identificação básica.' },
      { titulo: 'Atualiza histórico', descricao: 'Vacinas, tratamentos e ocorrências.' },
      { titulo: 'Cria reservas', descricao: 'Aloja com datas de entrada e saída.' },
      { titulo: 'Consulta agenda', descricao: 'Vê o que está marcado para hoje.' },
    ],
    faq: [
      { q: 'Funciona offline?', a: 'Não. Requer ligação à internet para sincronizar.' },
      { q: 'Há limite de animais?', a: 'Não há limite imposto pelo módulo.' },
    ],
  },
  {
    slug: 'dev',
    nome: 'FKT Dev',
    descricao: 'Projectos, issues e decisões técnicas',
    icone: 'Code',
    tagline: 'Decisões técnicas documentadas, projectos sob controlo.',
    rotaPrincipal: '/dev',
    descricaoLonga: [
      'O FKT Dev ajuda equipas a registar decisões arquitectónicas (ADRs), gerir projectos e seguir issues.',
      'Tudo num formato leve, sem a complexidade de ferramentas pesadas de gestão de projectos.',
    ],
    funcionalidades: [
      { icone: 'FolderGit2', titulo: 'Projectos', descricao: 'Organiza trabalho por projecto com contexto e estado.' },
      { icone: 'GitPullRequest', titulo: 'Issues', descricao: 'Regista bugs, tarefas e melhorias.' },
      { icone: 'BookOpen', titulo: 'ADRs', descricao: 'Architectural Decision Records com contexto e consequências.' },
      { icone: 'ListChecks', titulo: 'Planner', descricao: 'Próximas ações por projecto, sem fricção.' },
      { icone: 'FileText', titulo: 'Documentação anexa', descricao: 'Liga documentos relevantes a cada projecto.' },
      { icone: 'BarChart3', titulo: 'Visão analítica', descricao: 'Vê estado dos projectos e tendências.' },
    ],
    fluxo: [
      { titulo: 'Cria o projecto', descricao: 'Define nome, contexto e objetivos.' },
      { titulo: 'Regista decisões (ADRs)', descricao: 'Captura contexto, opções e consequências.' },
      { titulo: 'Acompanha issues', descricao: 'Bugs, melhorias e tarefas técnicas.' },
      { titulo: 'Mantém Planner activo', descricao: 'Próxima ação sempre visível.' },
    ],
    faq: [
      { q: 'Substitui o GitHub Issues?', a: 'Não. Complementa com decisões e contexto interno.' },
      { q: 'Suporta Markdown?', a: 'Sim, na maioria dos campos longos.' },
    ],
  },
  {
    slug: 'inspect',
    nome: 'FKT Inspect',
    descricao: 'Auditorias, evidências e acompanhamento de não conformidades',
    icone: 'ClipboardCheck',
    destaque: 'Planeado',
    emPreparacao: true,
    tagline: 'Auditorias estruturadas, evidências rastreáveis e acompanhamento de ações correctivas.',
    descricaoLonga: [
      'O FKT Inspect está a ser planeado para apoiar consultores, auditores e organizações na preparação e execução de auditorias, começando pela segurança alimentar e higiene em estabelecimentos de restauração.',
      'A proposta liga critérios de auditoria, observações, medições, evidências, não conformidades e ações correctivas, mantendo o histórico e a versão do modelo utilizado.',
      'O módulo ainda não está implementado nem disponível para utilização. O seu âmbito, modelo de dados e arquitectura de segurança encontram-se em documentação e revisão. O FKT Works mantém prioridade de conclusão do MVP.',
    ],
    funcionalidades: [
      { icone: 'ClipboardCheck', titulo: 'Auditorias estruturadas', descricao: 'Preparação e execução de auditorias com modelos versionados e critérios definidos.' },
      { icone: 'Camera', titulo: 'Evidências e medições', descricao: 'Associação de fotografias, documentos, observações e medições aos critérios verificados.' },
      { icone: 'ListChecks', titulo: 'Não conformidades', descricao: 'Registo de constatações, responsáveis, prazos e ações correctivas.' },
      { icone: 'ShieldCheck', titulo: 'Rastreabilidade', descricao: 'Histórico de alterações, submissões e relatórios associados a cada auditoria.' },
      { icone: 'Users', titulo: 'Consultoria e controlo interno', descricao: 'Concepção para consultores com vários clientes e empresas que auditam os próprios estabelecimentos.' },
    ],
    fluxo: [
      { titulo: 'Define o âmbito', descricao: 'Identifica o estabelecimento, a actividade e o modelo de auditoria aplicável.' },
      { titulo: 'Executa a auditoria', descricao: 'Regista resultados, observações, medições e evidências por critério.' },
      { titulo: 'Regista constatações', descricao: 'Documenta não conformidades e respectivas evidências.' },
      { titulo: 'Acompanha acções', descricao: 'Atribui responsáveis e prazos e recebe respostas às acções correctivas.' },
      { titulo: 'Verifica e emite relatório', descricao: 'O auditor verifica a eficácia e emite uma versão identificada do relatório.' },
    ],
    faq: [
      { q: 'O FKT Inspect já está disponível?', a: 'Não. Está em fase de planeamento e revisão técnica. Ainda não está implementado nem disponível para utilização.' },
      { q: 'Qual é a primeira área prevista?', a: 'Segurança alimentar e higiene em estabelecimentos de restauração e preparação de refeições. A aplicação a outros sectores exige análise própria.' },
      { q: 'O FKT Inspect substitui um sistema HACCP ou uma auditoria oficial?', a: 'Não. A ferramenta destina-se a organizar auditorias, evidências e acções. Não substitui a responsabilidade do operador alimentar, a análise de perigos específica, a consultoria especializada, a fiscalização oficial ou a certificação.' },
      { q: 'Quem poderá utilizar o módulo?', a: 'A concepção prevê consultores e auditores que trabalham com vários clientes, bem como empresas que realizam controlos internos nos seus estabelecimentos.' },
    ],
  }

];

export function getModulo(slug: string) {
  return modulos.find((m) => m.slug === slug);
}
