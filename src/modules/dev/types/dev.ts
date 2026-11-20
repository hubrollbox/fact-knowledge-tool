import type { Database } from '@/integrations/supabase/types';

export type DevProjecto = Database['public']['Tables']['dev_projectos']['Row'];
export type DevProjectoInsert = Database['public']['Tables']['dev_projectos']['Insert'];
export type DevIssue = Database['public']['Tables']['dev_issues']['Row'];
export type DevIssueInsert = Database['public']['Tables']['dev_issues']['Insert'];
export type DevAdr = Database['public']['Tables']['dev_adrs']['Row'];
export type DevAdrInsert = Database['public']['Tables']['dev_adrs']['Insert'];

export type IssueTipo = 'bug' | 'feature' | 'decisao' | 'discussao' | 'outro';
export type IssuePrioridade = 'critica' | 'alta' | 'media' | 'baixa';
export type IssueEstado = 'aberto' | 'em_progresso' | 'resolvido' | 'fechado';
export type AdrEstado = 'proposto' | 'aceite' | 'depreciado' | 'substituido';
export type ProjectoEstado = 'activo' | 'pausado' | 'arquivado';
