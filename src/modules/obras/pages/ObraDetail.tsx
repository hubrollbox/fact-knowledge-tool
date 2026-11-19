import { Link, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useObra, useVisitas, useOcorrencias, useAcoes, useActualizarEstado } from '../hooks/useObras';
import { ESTADOS_ACAO, ESTADOS_OBRA } from '../types/obras';
import { VisitaDialog } from '../components/VisitaDialog';
import { OcorrenciaDialog } from '../components/OcorrenciaDialog';
import { OcorrenciaItem } from '../components/OcorrenciaItem';
import { AcaoDialog } from '../components/AcaoDialog';
import { DocumentosObra } from '../components/DocumentosObra';

export function ObraDetail() {
  const { id } = useParams();
  const { data: obra, isLoading } = useObra(id);
  const { data: visitas } = useVisitas(id);
  const { data: ocorrencias } = useOcorrencias(id);
  const { data: acoes } = useAcoes(id);
  const { canWrite } = useWorkspaceRole();
  const upd = useActualizarEstado();

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (!obra) return <p className="text-sm text-muted-foreground">Obra não encontrada.</p>;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild><Link to="/obras"><ArrowLeft className="h-4 w-4 mr-1" />Obras</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{obra.nome}</h1>
          <p className="text-sm text-muted-foreground">{[obra.codigo, obra.morada, obra.dono_obra].filter(Boolean).join(' · ')}</p>
        </div>
        {canWrite ? (
          <Select value={obra.estado} onValueChange={(estado) => upd.mutate({ table: 'obras', id: obra.id, estado })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ESTADOS_OBRA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        ) : <Badge variant="outline">{ESTADOS_OBRA[obra.estado as keyof typeof ESTADOS_OBRA]}</Badge>}
      </div>

      <Tabs defaultValue="visitas">
        <TabsList>
          <TabsTrigger value="visitas">Visitas ({visitas?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências ({ocorrencias?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="acoes">Ações ({acoes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="visitas" className="space-y-3">
          {canWrite && <VisitaDialog obraId={obra.id} />}
          {!visitas?.length ? <p className="text-sm text-muted-foreground">Ainda não há visitas. Inicie uma visita quando estiver no terreno.</p> : visitas.map((v) => (
            <Link key={v.id} to={`/obras/${obra.id}/visita/${v.id}`} className="block border border-border rounded-md p-3 hover:bg-muted/50">
              <div className="text-sm font-medium">{new Date(v.data_visita).toLocaleDateString('pt-PT')}{v.hora_inicio && ` · ${v.hora_inicio.slice(0, 5)}`}</div>
              <div className="text-xs text-muted-foreground">{[v.tecnico, v.condicoes_meteo].filter(Boolean).join(' · ') || 'Sem detalhes'}</div>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="ocorrencias" className="space-y-3">
          {canWrite && <OcorrenciaDialog obraId={obra.id} />}
          {!ocorrencias?.length ? <p className="text-sm text-muted-foreground">Ainda não há ocorrências.</p> : ocorrencias.map((o) => <OcorrenciaItem key={o.id} o={o} canWrite={canWrite} />)}
        </TabsContent>

        <TabsContent value="documentos" className="space-y-3">
          <DocumentosObra obraId={obra.id} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="acoes" className="space-y-3">
          {canWrite && <AcaoDialog obraId={obra.id} ocorrencias={ocorrencias ?? []} />}
          {!acoes?.length ? <p className="text-sm text-muted-foreground">Ainda não há ações.</p> : acoes.map((a) => {
            const atrasada = a.prazo && a.estado !== 'concluida' && new Date(a.prazo) < new Date(new Date().toDateString());
            return (
              <div key={a.id} className="flex items-center justify-between gap-2 border border-border rounded-md p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.responsavel ?? 'Sem responsável'}
                    {a.prazo && <span className={atrasada ? 'text-destructive' : ''}> · prazo {new Date(a.prazo).toLocaleDateString('pt-PT')}</span>}
                  </div>
                </div>
                {canWrite ? (
                  <Select value={a.estado} onValueChange={(estado) => upd.mutate({ table: 'obras_acoes', id: a.id, estado })}>
                    <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ESTADOS_ACAO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Badge variant="outline">{ESTADOS_ACAO[a.estado as keyof typeof ESTADOS_ACAO]}</Badge>}
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
