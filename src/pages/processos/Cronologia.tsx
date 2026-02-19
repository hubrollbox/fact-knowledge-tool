import { useState, useEffect } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatarData, CERTEZA_LABELS, exportarCSV } from '@/lib/utils-fkt';
import type { Facto, Processo } from '@/types';

interface FactoWithProcesso extends Facto {
  processo: { titulo: string };
}

export default function Cronologia() {
  const { user } = useAuth();
  const [factos, setFactos] = useState<FactoWithProcesso[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProcesso, setFilterProcesso] = useState('todos');
  const [filterCerteza, setFilterCerteza] = useState('todas');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [pRes, fRes] = await Promise.all([
        supabase.from('processos').select('id, titulo').eq('user_id', user.id).order('titulo'),
        supabase.from('factos').select('*, processo:processos!inner(titulo, user_id)').eq('processos.user_id', user.id).order('data_facto', { ascending: true, nullsFirst: false }),
      ]);
      setProcessos((pRes.data as Processo[]) || []);
      setFactos((fRes.data as FactoWithProcesso[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = factos.filter(f => {
    const matchSearch = !search || f.descricao.toLowerCase().includes(search.toLowerCase());
    const matchProcesso = filterProcesso === 'todos' || f.processo_id === filterProcesso;
    const matchCerteza = filterCerteza === 'todas' || f.grau_certeza === filterCerteza;
    return matchSearch && matchProcesso && matchCerteza;
  });

  const handleExport = () => {
    exportarCSV(
      filtered.map(f => ({
        Data: formatarData(f.data_facto),
        Processo: f.processo?.titulo || '',
        Descrição: f.descricao,
        Certeza: CERTEZA_LABELS[f.grau_certeza],
        Observações: f.observacoes || '',
      })),
      'cronologia-factos'
    );
  };

  const certezaBadge = (c: string) => {
    const colors: Record<string, string> = {
      alto: 'bg-foreground text-background',
      medio: 'bg-muted text-foreground border border-border',
      baixo: 'bg-muted text-muted-foreground',
      desconhecido: 'bg-muted/50 text-muted-foreground',
    };
    return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[c] || ''}`}>{CERTEZA_LABELS[c] || c}</span>;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cronologia</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} factos ordenados por data</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar factos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterProcesso} onValueChange={setFilterProcesso}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os processos</SelectItem>
              {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCerteza} onValueChange={setFilterCerteza}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda certeza</SelectItem>
              {Object.entries(CERTEZA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum facto encontrado</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />
            <div className="space-y-4">
              {filtered.map((f, i) => (
                <div key={f.id} className="flex gap-4 relative">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="h-[10px] w-[10px] rounded-full border-2 border-foreground bg-background mt-3 shrink-0" />
                  </div>
                  <Card className="flex-1 border-border hover:border-foreground/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{f.descricao}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium">{formatarData(f.data_facto)}</span>
                            <span className="text-xs text-muted-foreground">· {f.processo?.titulo}</span>
                            {certezaBadge(f.grau_certeza)}
                          </div>
                          {f.observacoes && <p className="text-xs text-muted-foreground mt-1 italic">{f.observacoes}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">#{i + 1}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
