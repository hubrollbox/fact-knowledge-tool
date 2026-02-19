import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FolderOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import type { Processo } from '@/types';

export default function ProcessosList() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [counts, setCounts] = useState<Record<string, { factos: number; documentos: number }>>({});

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('processos')
        .select('*, cliente:clientes(id, nome)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setProcessos((data as Processo[]) || []);

      // fetch counts
      if (data && data.length > 0) {
        const ids = data.map((p: Processo) => p.id);
        const [fRes, dRes] = await Promise.all([
          supabase.from('factos').select('processo_id').in('processo_id', ids),
          supabase.from('documentos').select('processo_id').in('processo_id', ids),
        ]);
        const c: Record<string, { factos: number; documentos: number }> = {};
        ids.forEach(id => { c[id] = { factos: 0, documentos: 0 }; });
        (fRes.data || []).forEach((f: { processo_id: string }) => { if (c[f.processo_id]) c[f.processo_id].factos++; });
        (dRes.data || []).forEach((d: { processo_id: string }) => { if (c[d.processo_id]) c[d.processo_id].documentos++; });
        setCounts(c);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = processos.filter(p => {
    const matchSearch = !search || p.titulo.toLowerCase().includes(search.toLowerCase()) || (p.materia || '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      em_analise: 'bg-muted text-muted-foreground border border-border',
      em_progresso: 'bg-foreground text-background',
      concluido: 'bg-muted text-foreground border border-border',
      arquivado: 'bg-muted/50 text-muted-foreground',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[estado] || 'bg-muted'}`}>
        {ESTADO_LABELS[estado] || estado}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Processos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{processos.length} processo{processos.length !== 1 ? 's' : ''} no total</p>
          </div>
          <Button asChild>
            <Link to="/processos/novo"><Plus className="h-4 w-4 mr-2" />Novo Processo</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por título ou matéria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {Object.entries(ESTADO_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{search || filterEstado !== 'todos' ? 'Nenhum processo encontrado' : 'Nenhum processo criado ainda'}</p>
            {!search && filterEstado === 'todos' && (
              <Button asChild className="mt-4" variant="outline">
                <Link to="/processos/novo">Criar primeiro processo</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Card key={p.id} className="border-border hover:border-foreground/20 transition-colors">
                <CardContent className="p-4">
                  <Link to={`/processos/${p.id}`} className="block">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground hover:underline">{p.titulo}</h3>
                          {estadoBadge(p.estado)}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground capitalize">{p.tipo}</span>
                          {p.materia && <span className="text-xs text-muted-foreground">· {p.materia}</span>}
                          {p.cliente && <span className="text-xs text-muted-foreground">· {(p.cliente as { nome: string }).nome}</span>}
                        </div>
                        {p.descricao && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{p.descricao}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">{formatarData(p.updated_at)}</p>
                        {counts[p.id] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {counts[p.id].factos} factos · {counts[p.id].documentos} docs
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
