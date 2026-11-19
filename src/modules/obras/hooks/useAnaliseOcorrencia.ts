import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useObrasWorkspace } from './useObrasWorkspace';
import type { AnaliseOcorrenciaInsert, FactoOcorrenciaInsert } from '../types/obras';

const onErr = (e: Error) => toast({ title: 'Não foi guardado', description: e.message, variant: 'destructive' });

export function useAnaliseOcorrencia(ocorrenciaId: string) {
 return useQuery({
  queryKey: ['obras_ocorrencia_analise', ocorrenciaId], enabled: !!ocorrenciaId,
  queryFn: async () => {
   const { data: analise, error } = await supabase.from('obras_ocorrencia_analises').select('*').eq('ocorrencia_id',ocorrenciaId).maybeSingle();
   if (error) throw error;
   if (!analise) return { analise: null, factos: [] };
   const { data: factos, error: factosError } = await supabase.from('obras_ocorrencia_factos').select('*').eq('analise_id',analise.id).order('created_at');
   if (factosError) throw factosError;
   return { analise, factos: factos ?? [] };
  }
 });
}
export function useGuardarAnaliseOcorrencia() {
 const qc=useQueryClient(), ws=useObrasWorkspace();
 return useMutation({
  mutationFn: async ({ocorrenciaId,analiseId,values}:{ocorrenciaId:string;analiseId?:string;values:Omit<AnaliseOcorrenciaInsert,'workspace_id'|'ocorrencia_id'|'created_by'|'updated_by'>}) => {
   if(!ws) throw new Error('Sem espaço de trabalho');
   const {data:authData,error:authError}=await supabase.auth.getUser();
   if(authError) throw authError;
   if(!authData.user) throw new Error('Sessão não autenticada');
   if(analiseId) {
    const {data,error}=await supabase.from('obras_ocorrencia_analises').update({...values,updated_by:authData.user.id}).eq('id',analiseId).select().single();
    if(error) throw error; return data;
   }
   const {data,error}=await supabase.from('obras_ocorrencia_analises').insert({...values,ocorrencia_id:ocorrenciaId,workspace_id:ws,created_by:authData.user.id,updated_by:authData.user.id}).select().single();
   if(error) throw error; return data;
  },
  onSuccess:(_,v)=>{qc.invalidateQueries({queryKey:['obras_ocorrencia_analise',v.ocorrenciaId]});toast({title:'Análise guardada'});},
  onError:onErr
 });
}
export function useAdicionarFactoOcorrencia() {
 const qc=useQueryClient(), ws=useObrasWorkspace();
 return useMutation({
  mutationFn:async ({ocorrenciaId,analiseId,values}:{ocorrenciaId:string;analiseId:string;values:Omit<FactoOcorrenciaInsert,'workspace_id'|'analise_id'|'created_by'>})=>{
   if(!ws) throw new Error('Sem espaço de trabalho');
   const {data:authData,error:authError}=await supabase.auth.getUser();
   if(authError) throw authError;
   if(!authData.user) throw new Error('Sessão não autenticada');
   const {data,error}=await supabase.from('obras_ocorrencia_factos').insert({...values,analise_id:analiseId,workspace_id:ws,created_by:authData.user.id}).select().single();
   if(error) throw error; return data;
  },
  onSuccess:(_,v)=>qc.invalidateQueries({queryKey:['obras_ocorrencia_analise',v.ocorrenciaId]}),
  onError:onErr
 });
}
export function useEliminarFactoOcorrencia() {
 const qc=useQueryClient();
 return useMutation({
  mutationFn:async ({id}:{id:string;ocorrenciaId:string})=>{const {error}=await supabase.from('obras_ocorrencia_factos').delete().eq('id',id);if(error) throw error;},
  onSuccess:(_,v)=>qc.invalidateQueries({queryKey:['obras_ocorrencia_analise',v.ocorrenciaId]}),
  onError:onErr
 });
}
