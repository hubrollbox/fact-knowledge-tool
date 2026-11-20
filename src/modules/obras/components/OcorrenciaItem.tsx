import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown,ChevronUp,MapPin,ExternalLink } from 'lucide-react';
import { useActualizarEstado } from '../hooks/useObras';
import { ESTADOS_OCORRENCIA,GRAVIDADES,gravidadeVariant,type Ocorrencia } from '../types/obras';
import { FotosGaleria } from './FotosGaleria';
import { AnaliseOcorrencia } from './AnaliseOcorrencia';
import { DocumentosAssociados } from './DocumentosAssociados';
import { HistoricoOcorrencia } from './HistoricoOcorrencia';

export function OcorrenciaItem({o,canWrite}:{o:Ocorrencia;canWrite:boolean}) {
 const [aberto,setAberto]=useState(false), upd=useActualizarEstado();
 return <div className="border border-border rounded-md p-3 space-y-2">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
   <div className="min-w-0"><div className="font-medium text-sm">{o.titulo}</div>{o.localizacao&&<div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/>{o.localizacao}</div>}</div>
   <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
    <Badge variant={gravidadeVariant(o.gravidade)}>{GRAVIDADES[o.gravidade as keyof typeof GRAVIDADES]??o.gravidade}</Badge>
    {canWrite?<Select value={o.estado} onValueChange={estado=>upd.mutate({table:'obras_ocorrencias',id:o.id,estado})}><SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(ESTADOS_OCORRENCIA).map(([k,l])=><SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>:<Badge variant="outline">{ESTADOS_OCORRENCIA[o.estado as keyof typeof ESTADOS_OCORRENCIA]}</Badge>}
    <Button asChild size="sm" variant="outline"><Link to={`/obras/${o.obra_id}/ocorrencia/${o.id}`}><ExternalLink className="mr-1 h-3.5 w-3.5"/>Abrir dossier</Link></Button>
    <Button size="icon" variant="ghost" className="h-10 w-10" onClick={()=>setAberto(!aberto)} aria-label="Ver detalhes">{aberto?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</Button>
   </div>
  </div>
  {aberto&&<div className="space-y-4 pt-1">{o.descricao&&<p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.descricao}</p>}
   <FotosGaleria ocorrenciaId={o.id} canWrite={canWrite}/>
   <section className="space-y-2"><h4 className="text-sm font-semibold">Documentos associados</h4><DocumentosAssociados obraId={o.obra_id} ocorrenciaId={o.id}/></section>
   <Accordion type="single" collapsible><AccordionItem value="analise" className="border rounded-md px-3">
    <AccordionTrigger className="min-h-11 text-sm text-left">Análise técnica de escritório</AccordionTrigger>
    <AccordionContent><AnaliseOcorrencia ocorrenciaId={o.id} canWrite={canWrite}/></AccordionContent>
   </AccordionItem></Accordion>
   <HistoricoOcorrencia ocorrenciaId={o.id}/>
  </div>}
 </div>;
}
