import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarClock, ClipboardList, ExternalLink, Filter, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADOS_ACAO } from '../types/obras';
import { useAtribuirAcao, useFilaAcoes, useMembrosFilaAcoes, useOcorrenciasComLacunas, type AcaoFila } from '../hooks/useFilaAcoes';
import { useActualizarEstado } from '../hooks/useObras';

const hoje = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const dataPt = (v: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('pt-PT') : 'Sem prazo';

export function FilaAcoes() {
  const { data: acoes = [], isLoading, isError, error } = useFilaAcoes();
  const { data: membros = [] } = useMembrosFilaAcoes();
  const { data: ocorrenciasLacunas = [] } = useOcorrenciasComLacunas();
  const { canWrite } = useWorkspaceRole();
  const { user } = useAuth();
  const atribuir = useAtribuirAcao();
  const actualizarEstado = useActualizarEstado();
  const [estado, setEstado] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [obra, setObra] = useState('todas');
  const [prazo, setPrazo] = useState('todos');
  const [pesquisa, setPesquisa] = useState('');

  const obras = useMemo(() => [...new Map(acoes.map(a => [a.obra_id, { id: a.obra_id, nome: a.obras?.nome ?? 'Obra sem nome' }])).values()], [acoes]);
  const filtradas = useMemo(() => acoes.filter(a => {
    if (estado !== 'todos' && a.estado !== estado) return false;
    if (responsavel === 'minhas' && a.responsavel_user_id !== user?.id) return false;
    if (responsavel === 'sem' && (a.responsavel_user_id || a.responsavel)) return false;
    if (responsavel !== 'todos' && responsavel !== 'minhas' && responsavel !== 'sem' && a.responsavel_user_id !== responsavel) return false;
    if (obra !== 'todas' && a.obra_id !== obra) return false;
    if (prazo === 'atrasadas' && !(a.prazo && a.prazo < hoje() && a.estado !== 'concluida')) return false;
    if (prazo === 'proximas' && !(a.prazo && a.prazo >= hoje() && a.prazo <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) && a.estado !== 'concluida')) return false;
    if (prazo === 'sem' && a.prazo) return false;
    const term = pesquisa.trim().toLocaleLowerCase('pt-PT');
    return !term || [a.descricao, a.responsavel, a.obras?.nome, a.obras_ocorrencias?.titulo].some(v => v?.toLocaleLowerCase('pt-PT').includes(term));
  }), [acoes, estado, responsavel, obra, prazo, pesquisa, user?.id]);

  const abertas = acoes.filter(a => a.estado !== 'concluida');
  const atrasadas = abertas.filter(a => a.prazo && a.prazo < hoje());
  const proximas = abertas.filter(a => a.prazo && a.prazo >= hoje() && a.prazo <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const semAnalise = acoes.filter(a => a.ocorrencia_id && (!a.analise || (!a.analise.interpretacao && !a.analise.conclusao && !a.analise.recomendacao)));
  const semConclusao = acoes.filter(a => a.ocorrencia_id && a.analise && !a.analise.conclusao);
  const dataAtraso = (a: AcaoFila) => !!a.prazo && a.prazo < hoje() && a.estado !== 'concluida';

  const alterarResponsavel = (a: AcaoFila, id: string) => {
    const membro = membros.find(m => m.user_id === id);
    atribuir.mutate({ id: a.id, responsavel_user_id: id === 'none' ? null : id, responsavel: id === 'none' ? null : (a.responsavel || (membro ? `Membro ${membro.user_id.slice(0, 8)}` : null)) });
  };

  return (
    <main className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link to="/obras"><ArrowLeft className="mr-1 h-4 w-4" />Voltar às obras</Link></Button>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Fila de acções</h1><p className="text-sm text-muted-foreground">Acompanhamento de responsáveis, prazos e ocorrências associadas</p></div>
        <Badge variant="outline">{abertas.length} por concluir</Badge>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Acções abertas</div><div className="mt-1 text-2xl font-semibold">{abertas.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Atrasadas</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-destructive"><AlertTriangle className="h-5 w-5" />{atrasadas.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Prazo nos próximos 3 dias</div><div className="mt-1 text-2xl font-semibold">{proximas.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ocorrências sem análise/conclusão</div><div className="mt-1 text-2xl font-semibold">{ocorrenciasLacunas.length}</div></CardContent></Card>
      </section>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" />Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1"><Label>Pesquisar</Label><Input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Acção, obra ou ocorrência" /></div>
          <div className="space-y-1"><Label>Estado</Label><Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{Object.entries(ESTADOS_ACAO).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Responsável</Label><Select value={responsavel} onValueChange={setResponsavel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="minhas">Atribuídas a mim</SelectItem><SelectItem value="sem">Sem responsável</SelectItem>{membros.map(m => <SelectItem key={m.user_id} value={m.user_id}>Membro {m.user_id.slice(0,8)} · {m.role}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Prazo</Label><Select value={prazo} onValueChange={setPrazo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="atrasadas">Atrasadas</SelectItem><SelectItem value="proximas">Próximos 3 dias</SelectItem><SelectItem value="sem">Sem prazo</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label>Obra</Label><Select value={obra} onValueChange={setObra}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as obras</SelectItem>{obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ocorrências que precisam de decisão</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!ocorrenciasLacunas.length ? <p className="text-sm text-muted-foreground">Não existem ocorrências abertas com lacunas de análise identificadas.</p> : ocorrenciasLacunas.map(o => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div><div className="text-sm font-medium">{o.titulo}</div><div className="text-xs text-muted-foreground">{o.obras?.nome ?? 'Obra'}</div></div>
              <div className="flex flex-wrap items-center gap-2">
                {!o.analise || (!o.analise.interpretacao && !o.analise.conclusao && !o.analise.recomendacao) ? <Badge variant="destructive">Sem análise</Badge> : <>{!o.analise.conclusao && <Badge variant="outline">Sem conclusão</Badge>}{!o.analise.recomendacao && <Badge variant="outline">Sem recomendação</Badge>}</>}
                <Button asChild size="sm" variant="outline"><Link to={`/obras/${o.obra_id}/ocorrencia/${o.id}`}>Abrir dossier</Link></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isLoading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />A carregar acções…</div> : isError ? <p className="text-sm text-destructive">Não foi possível carregar a fila: {(error as Error)?.message}</p> : !filtradas.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"><ClipboardList className="mx-auto mb-2 h-7 w-7" />Não existem acções para os filtros seleccionados.</CardContent></Card> : (
        <div className="space-y-3">
          {filtradas.map(a => (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><div className="font-medium">{a.descricao}</div><div className="mt-1 text-xs text-muted-foreground">{a.obras?.nome ?? 'Obra'}{a.obras_ocorrencias ? ` · ${a.obras_ocorrencias.titulo}` : ''}</div></div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant={dataAtraso(a) ? 'destructive' : a.estado === 'concluida' ? 'secondary' : 'outline'}>{dataAtraso(a) ? 'Atrasada' : ESTADOS_ACAO[a.estado as keyof typeof ESTADOS_ACAO] ?? a.estado}</Badge>{a.prazo && <Badge variant="outline"><CalendarClock className="mr-1 h-3 w-3" />{dataPt(a.prazo)}</Badge>}{canWrite && <Select value={a.estado} onValueChange={estado => actualizarEstado.mutate({ table: 'obras_acoes', id: a.id, estado })}><SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ESTADOS_ACAO).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>}</div>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="text-xs text-muted-foreground">Responsável: {a.responsavel || 'Não atribuído'}</div>
                  {canWrite && <div className="w-full max-w-xs space-y-1"><Label className="text-xs">Atribuir a membro</Label><Select value={a.responsavel_user_id ?? 'none'} onValueChange={v => alterarResponsavel(a,v)}><SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar membro" /></SelectTrigger><SelectContent><SelectItem value="none">Sem atribuição</SelectItem>{membros.map(m => <SelectItem key={m.user_id} value={m.user_id}>Membro {m.user_id.slice(0,8)} · {m.role}</SelectItem>)}</SelectContent></Select></div>}
                </div>
                {a.ocorrencia_id && <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
                  <Link className="inline-flex items-center gap-1 text-primary hover:underline" to={`/obras/${a.obra_id}/ocorrencia/${a.ocorrencia_id}`}>Abrir ocorrência <ExternalLink className="h-3 w-3" /></Link>
                  {!a.analise || (!a.analise.interpretacao && !a.analise.conclusao && !a.analise.recomendacao) ? <Badge variant="destructive">Sem análise</Badge> : <>{!a.analise.conclusao && <Badge variant="outline">Sem conclusão</Badge>}{!a.analise.recomendacao && <Badge variant="outline">Sem recomendação</Badge>}</>}
                </div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
