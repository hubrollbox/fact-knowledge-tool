import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CalendarDays, FileText, Loader2, MapPin } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useObra, useOcorrencia, useVisita, useAcoes } from '../hooks/useObras';
import { FotosGaleria } from '../components/FotosGaleria';
import { AnaliseOcorrencia } from '../components/AnaliseOcorrencia';
import { DocumentosAssociados } from '../components/DocumentosAssociados';
import { FormResponses } from '../components/FormResponses';
import { HistoricoOcorrencia } from '../components/HistoricoOcorrencia';
import { AcompanhamentoOcorrencia } from '../components/AcompanhamentoOcorrencia';
import { OcorrenciasRelacionadas } from '../components/OcorrenciasRelacionadas';
import { ClassificacaoOcorrencia } from '../components/ClassificacaoOcorrencia';
import { EditarRegistoDialog } from '../components/EditarRegistoDialog';
import { ESTADOS_ACAO, ESTADOS_OCORRENCIA, GRAVIDADES, gravidadeVariant } from '../types/obras';

function dataPt(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-PT');
}

export function OcorrenciaDetail() {
  const { id, ocorrenciaId } = useParams();
  const { data: obra, isLoading: obraLoading } = useObra(id);
  const { data: ocorrencia, isLoading: ocorrenciaLoading } = useOcorrencia(id, ocorrenciaId);
  const { data: visita, isLoading: visitaLoading } = useVisita(ocorrencia?.visita_id ?? undefined);
  const { data: acoes, isLoading: acoesLoading } = useAcoes(id);
  const { canWrite } = useWorkspaceRole();

  if (obraLoading || ocorrenciaLoading || acoesLoading || (ocorrencia?.visita_id && visitaLoading)) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar dossier da ocorrência…</div>;
  }

  if (!obra || !ocorrencia || ocorrencia.obra_id !== obra.id) {
    return <div className="space-y-3 p-6"><p className="text-sm text-muted-foreground">Não foi possível localizar esta ocorrência nesta obra.</p><Button asChild variant="outline"><Link to={id ? `/obras/${id}` : '/obras'}>Voltar</Link></Button></div>;
  }

  const acoesOcorrencia = (acoes ?? []).filter((acao) => acao.ocorrencia_id === ocorrencia.id);
  const visitaUrl = visita ? `/obras/${obra.id}/visita/${visita.id}` : `/obras/${obra.id}`;

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm"><Link to={visitaUrl}><ArrowLeft className="mr-1 h-4 w-4" />{visita ? 'Voltar à visita' : obra.nome}</Link></Button>
        {ocorrencia.visita_id && <Button asChild variant="outline" size="sm"><Link to={`/obras/${obra.id}/visita/${ocorrencia.visita_id}/relatorio`}><FileText className="mr-2 h-4 w-4" />Relatório da visita</Link></Button>}
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={gravidadeVariant(ocorrencia.gravidade)}>{GRAVIDADES[ocorrencia.gravidade as keyof typeof GRAVIDADES] ?? ocorrencia.gravidade}</Badge>
          <Badge variant="outline">{ESTADOS_OCORRENCIA[ocorrencia.estado as keyof typeof ESTADOS_OCORRENCIA] ?? ocorrencia.estado}</Badge>
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{ocorrencia.titulo}</h1>
            {canWrite && <EditarRegistoDialog entity="ocorrencia" record={ocorrencia} obraId={obra.id} />}
          </div>
          <p className="text-sm text-muted-foreground">{obra.nome}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {ocorrencia.localizacao && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ocorrencia.localizacao}</span>}
          {visita && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Visita de {dataPt(visita.data_visita)}{visita.tecnico ? ` · ${visita.tecnico}` : ''}</span>}
        </div>
        {ocorrencia.descricao && <p className="max-w-4xl whitespace-pre-wrap text-sm">{ocorrencia.descricao}</p>}
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Evidência fotográfica</CardTitle></CardHeader>
        <CardContent><FotosGaleria ocorrenciaId={ocorrencia.id} canWrite={canWrite} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Factos, análise e referências técnicas</CardTitle></CardHeader>
        <CardContent><AnaliseOcorrencia ocorrenciaId={ocorrencia.id} canWrite={canWrite} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. Classificação</CardTitle></CardHeader>
        <CardContent><ClassificacaoOcorrencia ocorrenciaId={ocorrencia.id} obraId={obra.id} tipoInicial={ocorrencia.tipo ?? null} especialidadeInicial={ocorrencia.especialidade ?? null} canWrite={canWrite} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">4. Ocorrências relacionadas</CardTitle></CardHeader>
        <CardContent><OcorrenciasRelacionadas ocorrenciaId={ocorrencia.id} workspaceId={ocorrencia.workspace_id} canWrite={canWrite} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">5. Documentos associados</CardTitle></CardHeader>
        <CardContent><DocumentosAssociados obraId={obra.id} ocorrenciaId={ocorrencia.id} /></CardContent>
      </Card>

      {ocorrencia.visita_id && <FormResponses obraId={obra.id} visitaId={ocorrencia.visita_id} occurrenceId={ocorrencia.id} canWrite={canWrite} />}

      <Card>
        <CardHeader><CardTitle className="text-base">6. Acções associadas ({acoesOcorrencia.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!acoesOcorrencia.length ? <p className="text-sm text-muted-foreground">Ainda não existem acções associadas a esta ocorrência.</p> : acoesOcorrencia.map((acao) => (
            <div key={acao.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">{acao.descricao}</p>
                <Badge variant={acao.estado === 'concluida' ? 'secondary' : 'outline'}>{ESTADOS_ACAO[acao.estado as keyof typeof ESTADOS_ACAO] ?? acao.estado}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Responsável: {acao.responsavel || 'Não indicado'}</span>
                <span>Prazo: {dataPt(acao.prazo)}</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">A conclusão de uma acção não confirma, por si só, que a ocorrência esteja resolvida.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">7. Causas, acções e eficácia</CardTitle></CardHeader>
        <CardContent><AcompanhamentoOcorrencia ocorrenciaId={ocorrencia.id} workspaceId={ocorrencia.workspace_id} estado={ocorrencia.estado} acoes={acoesOcorrencia} canWrite={canWrite} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">8. Histórico e rastreabilidade</CardTitle></CardHeader>
        <CardContent><HistoricoOcorrencia ocorrenciaId={ocorrencia.id} /></CardContent>
      </Card>
    </main>
  );
}
