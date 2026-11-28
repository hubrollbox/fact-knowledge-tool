import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from 'lucide-react';

type Row = Record<string, any>;
type Props = { ocorrencias: Row[]; acoes: Row[]; onNavigate: (tab: 'ocorrencias' | 'acoes') => void };

export function IndicadoresObra({ ocorrencias, acoes, onNavigate }: Props) {
  const [desde, setDesde] = useState('');
  const [ate, setAte] = useState('');
  const [estado, setEstado] = useState('todos');
  const [responsavel, setResponsavel] = useState('todos');
  const [categoria, setCategoria] = useState('todos');

  const responsaveis = useMemo(() => [...new Set(acoes.map((a) => a.responsavel).filter(Boolean))].sort(), [acoes]);
  const categorias = useMemo(() => [...new Set(ocorrencias.map((o) => o.especialidade || o.tipo).filter(Boolean))].sort(), [ocorrencias]);

  const ocorrenciasFiltradas = useMemo(() => ocorrencias.filter((o) => {
    const data = String(o.created_at ?? '').slice(0, 10);
    return (!desde || data >= desde) && (!ate || data <= ate) &&
      (estado === 'todos' || o.estado === estado) &&
      (categoria === 'todos' || (o.especialidade || o.tipo) === categoria);
  }), [ocorrencias, desde, ate, estado, categoria]);

  const acoesFiltradas = useMemo(() => acoes.filter((a) => {
    const data = String(a.created_at ?? '').slice(0, 10);
    return (!desde || data >= desde) && (!ate || data <= ate) &&
      (estado === 'todos' || a.estado === estado) &&
      (responsavel === 'todos' || a.responsavel === responsavel);
  }), [acoes, desde, ate, estado, responsavel]);

  const abertas = ocorrenciasFiltradas.filter((o) => o.estado !== 'resolvida').length;
  const criticas = ocorrenciasFiltradas.filter((o) => ['alta', 'critica'].includes(o.gravidade)).length;
  const pendentes = acoesFiltradas.filter((a) => !['concluida', 'cancelada'].includes(a.estado)).length;
  const atrasadas = acoesFiltradas.filter((a) => a.prazo && !['concluida', 'cancelada'].includes(a.estado) && new Date(a.prazo).getTime() < new Date(new Date().toDateString()).getTime()).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Indicadores da obra</h2>
        <p className="text-sm text-muted-foreground">Valores calculados a partir das ocorrências e acções registadas nesta obra.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="text-xs text-muted-foreground">Desde</label><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Estado</label><Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os estados</SelectItem>{['aberta','em_resolucao','resolvida','pendente','em_curso','bloqueada','concluida','cancelada'].map((v) => <SelectItem key={v} value={v}>{v.replace('_',' ')}</SelectItem>)}</SelectContent></Select></div>
        <div><label className="text-xs text-muted-foreground">Responsável (acções)</label><Select value={responsavel} onValueChange={setResponsavel}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{responsaveis.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div><label className="text-xs text-muted-foreground">Categoria (ocorrências)</label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{categorias.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" />Ocorrências por resolver</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{abertas}</div><Button variant="link" className="h-auto p-0 text-xs" onClick={() => onNavigate('ocorrencias')}>Ver ocorrências</Button></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" />Alta/crítica</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{criticas}</div><Button variant="link" className="h-auto p-0 text-xs" onClick={() => onNavigate('ocorrencias')}>Ver ocorrências</Button></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ListTodo className="h-4 w-4" />Acções pendentes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendentes}</div><Button variant="link" className="h-auto p-0 text-xs" onClick={() => onNavigate('acoes')}>Ver acções</Button></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4" />Acções em atraso</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{atrasadas}</div><Button variant="link" className="h-auto p-0 text-xs" onClick={() => onNavigate('acoes')}>Ver acções</Button></CardContent></Card>
      </div>
      <p className="text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline h-3 w-3" />Os indicadores são contagens dos registos filtrados. O período usa a data de criação; o prazo é usado apenas para identificar acções em atraso.</p>
    </div>
  );
}
