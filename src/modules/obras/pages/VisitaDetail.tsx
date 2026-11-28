import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useObra, useOcorrencias, useVisita } from '../hooks/useObras';
import { OcorrenciaDialog } from '../components/OcorrenciaDialog';
import { OcorrenciaItem } from '../components/OcorrenciaItem';
import { FotosGaleria } from '../components/FotosGaleria';
import { DocumentosAssociados } from '../components/DocumentosAssociados';
import { EditarRegistoDialog } from '../components/EditarRegistoDialog';
import { FormResponses } from '../components/FormResponses';
import { AcaoDialog } from '../components/AcaoDialog';

export function VisitaDetail() {
  const { id, visitaId } = useParams();
  const { data: obra } = useObra(id);
  const { data: visita, isLoading } = useVisita(visitaId);
  const { data: ocorrencias } = useOcorrencias(id);
  const { canWrite } = useWorkspaceRole();
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!visita) return <p className="text-sm text-muted-foreground">Visita não encontrada.</p>;
  const daVisita = (ocorrencias ?? []).filter((o) => o.visita_id === visita.id);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild><Link to={`/obras/${id}`}><ArrowLeft className="h-4 w-4 mr-1" />{obra?.nome ?? 'Obra'}</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-bold tracking-tight">Visita de {new Date(visita.data_visita).toLocaleDateString('pt-PT')}</h1>
        <p className="text-sm text-muted-foreground">{[visita.hora_inicio?.slice(0, 5), visita.tecnico, visita.condicoes_meteo].filter(Boolean).join(' · ')}</p>
        {visita.notas && <p className="text-sm mt-2 whitespace-pre-wrap">{visita.notas}</p>}
        </div>
        {canWrite && <EditarRegistoDialog entity="visita" record={visita} obraId={id!} />}
        <Button asChild size="sm"><Link to={`/obras/${id}/visita/${visita.id}/relatorio`}><FileText className="h-4 w-4 mr-2" />Gerar relatório PDF</Link></Button>
      </div>
      <FormResponses obraId={visita.obra_id} visitaId={visita.id} canWrite={canWrite} />
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Ocorrências ({daVisita.length})</CardTitle>
          {canWrite && <div className="flex flex-wrap gap-2">
            <OcorrenciaDialog obraId={id!} visitaId={visita.id} />
            <AcaoDialog obraId={id!} ocorrencias={daVisita} visitas={[visita]} visitaId={visita.id} triggerLabel="Nova acção desta visita" />
          </div>}
        </CardHeader>
        <CardContent className="space-y-2">
          {!daVisita.length ? <p className="text-sm text-muted-foreground">Nenhuma ocorrência registada nesta visita.</p> : daVisita.map((o) => <OcorrenciaItem key={o.id} o={o} canWrite={canWrite} />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Fotos da visita</CardTitle></CardHeader>
        <CardContent><FotosGaleria visitaId={visita.id} canWrite={canWrite} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Documentos associados</CardTitle></CardHeader>
        <CardContent><DocumentosAssociados obraId={visita.obra_id} visitaId={visita.id} /></CardContent>
      </Card>
    </div>
  );
}
