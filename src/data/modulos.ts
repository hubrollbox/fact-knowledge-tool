import { Modulo } from '@/types/modulos';

export const modulos: Modulo[] = [
  {
    slug: 'juridico',
    nome: 'Jurídico',
    descricao: 'Processos, documentos e prazos',
    icone: 'Scale',
    tagline: 'Organiza processos, prazos e documentos com rigor.',
    rotaPrincipal: '/juridico',
    descricaoLonga: [
      'O módulo Jurídico ajuda a estruturar cada processo num dossier completo, com partes, factos, documentos e prazos sempre acessíveis.',
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
    nome: 'Canil & Vet',
    descricao: 'Animais, ninhadas e alojamento',
    icone: 'Dog',
    tagline: 'Gere animais, ninhadas e reservas de alojamento.',
    rotaPrincipal: '/canil',
    descricaoLonga: [
      'O módulo Canil & Vet centraliza fichas de animais, registos sanitários, ninhadas e reservas de alojamento.',
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
    nome: 'Desenvolvimento',
    descricao: 'Projectos, issues e decisões técnicas',
    icone: 'Code',
    tagline: 'Decisões técnicas documentadas, projectos sob controlo.',
    rotaPrincipal: '/dev',
    descricaoLonga: [
      'O módulo Desenvolvimento ajuda equipas a registar decisões arquitectónicas (ADRs), gerir projectos e seguir issues.',
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
];

export function getModulo(slug: string) {
  return modulos.find((m) => m.slug === slug);
}
