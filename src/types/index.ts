export type ProcessoTipo = 'academico' | 'profissional';
export type ProcessoEstado = 'em_analise' | 'em_progresso' | 'concluido' | 'arquivado';
export type IssuePrioridade = 'alta' | 'media' | 'baixa';
export type IssueEstado = 'aberta' | 'resolvida';
export type ApplicationTipo = 'pro' | 'contra';
export type GrauCerteza = 'alto' | 'medio' | 'baixo' | 'desconhecido';

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  morada: string | null;
  created_at: string;
  updated_at: string;
}

export interface Processo {
  id: string;
  user_id: string;
  titulo: string;
  tipo: ProcessoTipo;
  estado: ProcessoEstado;
  materia: string | null;
  descricao: string | null;
  cliente_id: string | null;
  cliente?: Cliente;
  created_at: string;
  updated_at: string;
  _count?: {
    factos: number;
    documentos: number;
    issues: number;
  };
}

export interface Facto {
  id: string;
  processo_id: string;
  descricao: string;
  data_facto: string | null;
  grau_certeza: GrauCerteza;
  observacoes: string | null;
  documento_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  processo_id: string;
  descricao: string;
  prioridade: IssuePrioridade;
  estado: IssueEstado;
  created_at: string;
  updated_at: string;
  conclusao?: Conclusao;
}

export interface Rule {
  id: string;
  processo_id: string;
  referencia: string;
  texto: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  fonte: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  processo_id: string;
  issue_id: string;
  rule_id: string;
  argumento: string;
  tipo: ApplicationTipo;
  created_at: string;
  updated_at: string;
  issue?: Issue;
  rule?: Rule;
  factos?: Facto[];
  application_factos?: ApplicationFacto[];
}

export interface ApplicationFacto {
  id: string;
  application_id: string;
  facto_id: string;
  facto?: Facto;
}

export interface Conclusao {
  id: string;
  issue_id: string;
  resultado: string;
  grau_confianca: GrauCerteza;
  pontos_frageis: string | null;
  created_at: string;
  updated_at: string;
}

export interface Documento {
  id: string;
  processo_id: string;
  titulo: string;
  tipo: string | null;
  data_documento: string | null;
  entidade_origem: string | null;
  localizacao: string | null;
  descricao: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Disciplina {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  docente: string | null;
  docente_telm: string | null;
  docente_email: string | null;
  regente: string | null;
  regente_telm: string | null;
  regente_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topico {
  id: string;
  disciplina_id: string;
  nome: string;
  conteudo: string | null;
  referencias: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaProcesso {
  id: string;
  disciplina_id: string;
  processo_id: string;
  processo?: Processo;
}
