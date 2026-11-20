import type { Tables } from '@/integrations/supabase/types';

export type Processo = Tables<'juridico_processos'>;
export type Parte = Tables<'juridico_partes'>;
export type Documento = Tables<'juridico_documentos'>;
export type Prazo = Tables<'juridico_prazos'>;

export type ProcessoInsert = {
  workspace_id: string;
  titulo: string;
  referencia?: string | null;
  numero_processo?: string | null;
  tipo?: string | null;
  tribunal?: string | null;
  estado?: string;
  contexto?: string | null;
  questao?: string | null;
  referencias?: string | null;
  analise?: string | null;
  conclusao?: string | null;
};

export type ProcessoUpdate = Partial<ProcessoInsert>;

export type ParteInsert = {
  processo_id: string;
  workspace_id: string;
  nome: string;
  tipo?: string;
  nif?: string | null;
  contacto?: string | null;
  mandatario?: string | null;
  notas?: string | null;
};

export type DocumentoInsert = {
  processo_id: string;
  workspace_id: string;
  nome: string;
  categoria?: string | null;
  ficheiro_url?: string | null;
  versao?: number;
  data_documento?: string | null;
  notas?: string | null;
};

export type PrazoInsert = {
  processo_id: string;
  workspace_id: string;
  descricao: string;
  data_limite: string;
  antecedencia_alerta?: number;
  estado?: string;
  notas?: string | null;
};
