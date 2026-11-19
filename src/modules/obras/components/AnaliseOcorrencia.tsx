import { useEffect,useState } from 'react';
import { Loader2,Plus,Save,Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFotos } from '../hooks/useFotosObra';
import { useAnaliseOcorrencia,useAdicionarFactoOcorrencia,useEliminarFactoOcorrencia,useGuardarAnaliseOcorrencia } from '../hooks/useAnaliseOcorrencia';

export function AnaliseOcorrencia({ocorrenciaId,canWrite}:{ocorrenciaId:string;canWrite:boolean}) {
 const {data,isLoading,isError}=useAnaliseOcorrencia(ocorrenciaId);
 const {data:fotos}=useFotos({ocorrenciaId});
 const guardar=useGuardarAnaliseOcorrencia(), adicionar=useAdicionarFactoOcorrencia(), eliminar=useEliminarFactoOcorrencia();
 const [interpretacao,setInterpretacao]=useState(''),[referencias,setReferencias]=useState(''),[conclusao,setConclusao]=useState(''),[recomendacao,setRecomendacao]=useState(''),[falta,setFalta]=useState('');
 const [descricao,setDescricao]=useState(''),[estado,setEstado]=useState('por_confirmar'),[fotoId,setFotoId]=useState('none'),[referencia,setReferencia]=useState('');
 const analise=data?.analise, factos=data?.factos??[];
 useEffect(()=>{
  setInterpretacao(analise?.interpretacao??'');setReferencias(analise?.referencias_gerais??'');
  setConclusao(analise?.conclusao??'');setRecomendacao(analise?.recomendacao??'');setFalta(analise?.informacao_em_falta??'');
 },[analise?.id,analise?.updated_at]);
 if(isLoading) return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>A carregar análise técnica…</div>;
 if(isError) return <p className="text-sm text-destructive">Não foi possível carregar a análise técnica.</p>;
 const onSave=async(e:React.FormEvent)=>{e.preventDefault();await guardar.mutateAsync({ocorrenciaId,analiseId:analise?.id,values:{interpretacao:interpretacao.trim()||null,referencias_gerais:referencias.trim()||null,conclusao:conclusao.trim()||null,recomendacao:recomendacao.trim()||null,informacao_em_falta:falta.trim()||null}});};
 const onAdd=async(e:React.FormEvent)=>{e.preventDefault();if(!analise||!descricao.trim())return;await adicionar.mutateAsync({ocorrenciaId,analiseId:analise.id,values:{descricao:descricao.trim(),estado,evidencia_foto_id:fotoId==='none'?null:fotoId,referencia:referencia.trim()||null}});setDescricao('');setEstado('por_confirmar');setFotoId('none');setReferencia('');};
 return <section className="rounded-md border border-border p-3 space-y-4">
  <div><h4 className="text-sm font-semibold">Análise técnica</h4><p className="text-xs text-muted-foreground">Separe observações, interpretação e conclusão. Não registe hipóteses como factos confirmados.</p></div>
  <form onSubmit={onSave} className="space-y-3">
   <div className="space-y-1.5"><Label>Interpretação técnica</Label><Textarea rows={3} value={interpretacao} onChange={e=>setInterpretacao(e.target.value)} disabled={!canWrite} placeholder="Interpretação dos factos observados; identifique hipóteses como hipóteses."/></div>
   <div className="space-y-1.5"><Label>Referências técnicas e documentais</Label><Textarea rows={2} value={referencias} onChange={e=>setReferencias(e.target.value)} disabled={!canWrite} placeholder="Documento, norma, projecto, versão, artigo ou outra fonte consultada."/></div>
   <div className="grid gap-3 md:grid-cols-2">
    <div className="space-y-1.5"><Label>Conclusão</Label><Textarea rows={3} value={conclusao} onChange={e=>setConclusao(e.target.value)} disabled={!canWrite}/></div>
    <div className="space-y-1.5"><Label>Recomendação</Label><Textarea rows={3} value={recomendacao} onChange={e=>setRecomendacao(e.target.value)} disabled={!canWrite}/></div>
   </div>
   <div className="space-y-1.5"><Label>Informação em falta / pontos por confirmar</Label><Textarea rows={2} value={falta} onChange={e=>setFalta(e.target.value)} disabled={!canWrite} placeholder="O que falta verificar antes de fechar a análise?"/></div>
   {canWrite&&<div className="flex justify-end"><Button type="submit" size="sm" disabled={guardar.isPending}>{guardar.isPending?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<Save className="h-4 w-4 mr-1"/>}Guardar análise</Button></div>}
  </form>
  <div className="border-t border-border pt-3 space-y-3">
   <div><h5 className="text-sm font-semibold">Factos observados</h5><p className="text-xs text-muted-foreground">Cada facto deve corresponder a uma observação concreta.</p></div>
   {!factos.length?<p className="text-xs text-muted-foreground">Ainda não foram registados factos individuais.</p>:<ul className="space-y-2">{factos.map(f=>{const foto=fotos?.find(x=>x.id===f.evidencia_foto_id);return <li key={f.id} className="rounded-md bg-muted/40 p-2 space-y-1.5"><div className="flex items-start justify-between gap-2"><p className="text-sm whitespace-pre-wrap">{f.descricao}</p><div className="flex items-center gap-2 shrink-0"><Badge variant={f.estado==='confirmado'?'secondary':'outline'}>{f.estado==='confirmado'?'Confirmado':'Por confirmar'}</Badge>{canWrite&&<Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Eliminar facto" disabled={eliminar.isPending} onClick={()=>eliminar.mutate({id:f.id,ocorrenciaId})}><Trash2 className="h-3.5 w-3.5"/></Button>}</div></div>{f.referencia&&<p className="text-xs text-muted-foreground">Referência: {f.referencia}</p>}{foto&&<p className="text-xs text-muted-foreground">Evidência fotográfica: {foto.legenda||'Fotografia associada'}</p>}</li>;})}</ul>}
   {canWrite&&<form onSubmit={onAdd} className="rounded-md border border-dashed border-border p-3 space-y-2">
    <Label htmlFor={`facto-${ocorrenciaId}`}>Novo facto</Label><Textarea id={`facto-${ocorrenciaId}`} required rows={2} value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Descreva uma observação concreta."/>
    <div className="grid gap-2 md:grid-cols-2"><div className="space-y-1"><Label>Estado do facto</Label><Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="confirmado">Confirmado</SelectItem><SelectItem value="por_confirmar">Por confirmar</SelectItem></SelectContent></Select></div>
     <div className="space-y-1"><Label>Evidência fotográfica</Label><Select value={fotoId} onValueChange={setFotoId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem fotografia associada</SelectItem>{(fotos??[]).map(f=><SelectItem key={f.id} value={f.id}>{f.legenda||new Date(f.capturada_em??f.created_at).toLocaleString('pt-PT')}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-1"><Label>Referência específica (opcional)</Label><Input value={referencia} onChange={e=>setReferencia(e.target.value)} placeholder="Desenho, pormenor, norma, página ou cláusula"/></div>
    <div className="flex justify-end"><Button type="submit" size="sm" disabled={!analise||adicionar.isPending}>{adicionar.isPending?<Loader2 className="h-4 w-4 animate-spin mr-1"/>:<Plus className="h-4 w-4 mr-1"/>}Adicionar facto</Button></div>
    {!analise&&<p className="text-xs text-muted-foreground">Guarde primeiro a análise para poder adicionar factos.</p>}
   </form>}
  </div>
  {analise&&<p className="text-[11px] text-muted-foreground">Criada em {new Date(analise.created_at).toLocaleString('pt-PT')} · Última actualização: {new Date(analise.updated_at).toLocaleString('pt-PT')}</p>}
 </section>;
}
