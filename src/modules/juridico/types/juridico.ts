import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Processo = Tables<'juridico_processos'>;
export type Parte = Tables<'juridico_partes'>;
export type Documento = Tables<'juridico_documentos'>;
export type Prazo = Tables<'juridico_prazos'>;
export type Facto = Tables<'juridico_factos'>;
export type Questao = Tables<'juridico_questoes'>;
export type Fonte = Tables<'juridico_fontes'>;
export type Aplicacao = Tables<'juridico_aplicacoes'>;
export type Conclusao = Tables<'juridico_conclusoes'>;

export type ProcessoInsert = TablesInsert<'juridico_processos'>;
export type ProcessoUpdate = TablesUpdate<'juridico_processos'>;
export type ParteInsert = TablesInsert<'juridico_partes'>;
export type DocumentoInsert = TablesInsert<'juridico_documentos'>;
export type PrazoInsert = TablesInsert<'juridico_prazos'>;
export type FactoInsert = TablesInsert<'juridico_factos'>;
export type QuestaoInsert = TablesInsert<'juridico_questoes'>;
export type FonteInsert = TablesInsert<'juridico_fontes'>;
export type AplicacaoInsert = TablesInsert<'juridico_aplicacoes'>;
export type ConclusaoInsert = TablesInsert<'juridico_conclusoes'>;
