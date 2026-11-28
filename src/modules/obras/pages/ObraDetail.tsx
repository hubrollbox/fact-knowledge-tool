import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AcaoComentarios } from '../components/AcaoComentarios';
import { PlaneamentoObra } from '../components/PlaneamentoObra';
import { IndicadoresObra } from '../components/IndicadoresObra';
import { RecepcaoObra } from '../components/RecepcaoObra';

export function ObraDetail() {
  const { id } = useParams();
  const { data: obra, isLoading } = useObra(id);
  const { data: visitas } = useVisitas(id);
  const { data: ocorrencias } = useOcorrencias(id);
  const { data: acoes } = useAcoes(id);
  const { canWrite } = useWorkspaceRole();
  const upd = useActualizarEstado();
  const [dataDesde, setDataDesde] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [tipoRegisto, setTipoRegisto] = useState('todos');
  const [pesquisaDiario, setPesquisaDiario] = useState('');
  const [activeTab, setActiveTab] = useState('visitas');
  const visitasFiltradas = useMemo(() => (visitas ?? []).filter((item) => {
    const row = item as any;
    const texto = [row.tecnico, row.condicoes_meteo, row.trabalhos_executados, row.equipa_intervenientes, row.equipamentos, row.materiais, row.condicionantes, row.atrasos, row.notas].filter(Boolean).join(' ').toLocaleLowerCase('pt-PT');
    return (!dataDesde || row.data_visita >= dataDesde) && (!dataAte || row.data_visita <= dataAte) && (tipoRegisto === 'todos' || (row.tipo_registo ?? 'visita') === tipoRegisto) && (!pesquisaDiario.trim() || texto.includes(pesquisaDiario.trim().toLocaleLowerCase('pt-PT')));
  }), [visitas, dataDesde, dataAte, tipoRegisto, pesquisaDiario]);

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

      {canWrite && (
        <section aria-label="Registos rápidos" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1 [&>div>button]:min-h-12 [&>div>button]:w-full">
            <OcorrenciaDialog obraId={obra.id} />
          </div>
          <div className="[&>button]:min-h-12 [&>button]:w-full">
            <VisitaDialog obraId={obra.id} />
          </div>
          <div className="[&>div>button]:min-h-12 [&>div>button]:w-full">
            <AcaoDialog obraId={obra.id} ocorrencias={ocorrencias ?? []} visitas={visitas ?? []} />
          </div>
        </section>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="sticky top-0 z-20 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur md:static md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-0" aria-label="Secções da obra">
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="visitas">Diário ({visitas?.length ?? 0})</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="ocorrencias">Ocorrências ({ocorrencias?.length ?? 0})</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="acoes">Ações ({acoes?.length ?? 0})</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="planeamento">Planeamento</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="documentos">Documentos</TabsTrigger>
          <TabsTrigger className="min-h-10 shrink-0 px-3" value="recepcao">Recepção</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" className="space-y-3">
          <IndicadoresObra ocorrencias={ocorrencias ?? []} acoes={acoes ?? []} onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="visitas" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><Button asChild variant="outline" size="sm"><Link to={`/obras/${obra.id}/diario/relatorio${dataDesde || dataAte ? `?${new URLSearchParams({ ...(dataDesde ? { desde: dataDesde } : {}), ...(dataAte ? { ate: dataAte } : {}) }).toString()}` : ''}`}>Relatório do período</Link></Button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-md border p-3">
            <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" value={dataDesde} onChange={(e) => setDataDesde(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Tipo de registo</label><Select value={tipoRegisto} onValueChange={setTipoRegisto}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="diario">Diário de obra</SelectItem><SelectItem value="visita">Visita</SelectItem><SelectItem value="reuniao">Reunião</SelectItem><SelectItem value="fiscalizacao">Fiscalização</SelectItem></SelectContent></Select></div>
            <div><label className="text-xs text-muted-foreground">Pesquisar no diário</label><Input value={pesquisaDiario} onChange={(e) => setPesquisaDiario(e.target.value)} placeholder="Trabalhos, materiais, equipa…" /></div>
          </div>
          {!visitas?.length ? <p className="text-sm text-muted-foreground">Ainda não existem registos no diário de obra.</p> : !visitasFiltradas.length ? <p className="text-sm text-muted-foreground">Não existem registos para os filtros seleccionados.</p> : visitasFiltradas.map((v) => { const row = v as any; const labels: Record<string,string> = { diario: 'Diário de obra', visita: 'Visita', reuniao: 'Reunião', fiscalizacao: 'Fiscalização' }; return (
            <Link key={v.id} to={`/obras/${obra.id}/visita/${v.id}`} className="block border border-border rounded-md p-3 hover:bg-muted/50">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-medium">{new Date(v.data_visita).toLocaleDateString('pt-PT')}{v.hora_inicio && ` · ${v.hora_inicio.slice(0, 5)}`}</div><Badge variant="outline">{labels[row.tipo_registo ?? 'visita'] ?? 'Visita'}</Badge></div>
              <div className="text-xs text-muted-foreground">{[v.tecnico, v.condicoes_meteo].filter(Boolean).join(' · ') || 'Sem detalhes'}</div>
              {row.trabalhos_executados && <p className="mt-2 text-sm line-clamp-2">{row.trabalhos_executados}</p>}
            </Link>
          ); })}
        </TabsContent>

        <TabsContent value="ocorrencias" className="space-y-3">
          <div className="text-sm font-medium">Ocorrências da obra</div>
          {!ocorrencias?.length ? <p className="text-sm text-muted-foreground">Ainda não há ocorrências.</p> : ocorrencias.map((o) => <OcorrenciaItem key={o.id} o={o} canWrite={canWrite} />)}
        </TabsContent>

        <TabsContent value="planeamento" className="space-y-3">
          <PlaneamentoObra obraId={obra.id} workspaceId={obra.workspace_id} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-3">
          <DocumentosObra obraId={obra.id} canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="acoes" className="space-y-3">
          <div className="text-sm font-medium">Acções da obra</div>
          {!acoes?.length ? <p className="text-sm text-muted-foreground">Ainda não há ações.</p> : acoes.map((a) => {
            const atrasada = a.prazo && !['concluida','cancelada'].includes(a.estado) && new Date(a.prazo) < new Date(new Date().toDateString());
            return (
              <div key={a.id} className="space-y-3 border border-border rounded-md p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.descricao}</div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-2">Prioridade: {(a as any).prioridade ?? 'normal'}</Badge>
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
                <AcaoComentarios acaoId={a.id} obraId={obra.id} workspaceId={obra.workspace_id} />
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
