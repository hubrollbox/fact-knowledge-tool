import type { Database } from '@/integrations/supabase/types';
type T = Database['public']['Tables'];
export type Obra = T['obras']['Row'];
export type ObraInsert = T['obras']['Insert'];
export type Visita = T['obras_visitas']['Row'];
export type VisitaInsert = T['obras_visitas']['Insert'];
export type Ocorrencia = T['obras_ocorrencias']['Row'];
export type OcorrenciaInsert = T['obras_ocorrencias']['Insert'];
export type Acao = T['obras_acoes']['Row'];
export type AcaoInsert = T['obras_acoes']['Insert'];
export type Foto = T['obras_fotos']['Row'];

export const ESTADOS_OBRA = { ativa: 'Ativa', suspensa: 'Suspensa', concluida: 'Concluída' } as const;
export const GRAVIDADES = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' } as const;
export const ESTADOS_OCORRENCIA = { aberta: 'Aberta', em_resolucao: 'Em resolução', resolvida: 'Resolvida' } as const;
export const ESTADOS_ACAO = { pendente: 'Pendente', em_curso: 'Em curso', concluida: 'Concluída' } as const;

export const gravidadeVariant = (g: string) =>
  g === 'critica' || g === 'alta' ? 'destructive' : g === 'media' ? 'secondary' : 'outline';
