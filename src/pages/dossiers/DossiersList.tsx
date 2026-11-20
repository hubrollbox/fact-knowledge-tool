import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import { ListFilters, emptyFilters, type ListFiltersValue } from '@/components/filters/ListFilters';
import { QueryState } from '@/components/common/QueryState';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { EditDossierDialog } from '@/components/dossiers/EditDossierDialog';
import { toast } from 'sonner';
import type { Dossier } from '@/types';

const TIPO_OPTIONS = [
  { value: 'academico', label: 'Académico' },
  { value: 'profissional', label: 'Profissional' },
];

export default function DossiersList() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ListFiltersValue>(emptyFilters);
  const [counts, setCounts] = useState<Record<string, { factos: number; documentos: number }>>({});
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [editing, setEditing] = useState<Dossier | null>(null);
  const [deleting, setDeleting] = useState<Dossier | null>(null);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const [dRes, cRes] = await Promise.all([
        supabase.from('dossiers').select('*, cliente:clientes(id, nome)')
          .eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
      ]);
      if (dRes.error) throw dRes.error;
      const list = (dRes.data as unknown as Dossier[]) || [];
      setDossiers(list);
      setClientes(cRes.data || []);
      if (list.length > 0) {
        const ids = list.map((p) => p.id);
        const [fRes, docRes] = await Promise.all([
          supabase.from('factos').select('dossier_id').in('dossier_id', ids),
          supabase.from('documentos').select('dossier_id').in('dossier_id', ids),
        ]);
        const c: Record<string, { factos: number; documentos: number }> = {};
        ids.forEach((id) => { c[id] = { factos: 0, documentos: 0 }; });
        (fRes.data || []).forEach((f: any) => { if (c[f.dossier_id]) c[f.dossier_id].factos++; });
        (docRes.data || []).forEach((d: any) => { if (c[d.dossier_id]) c[d.dossier_id].documentos++; });
        setCounts(c);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar dossiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [user]);

  const filtered = useMemo(() => {
    return dossiers.filter((p) => {
      const s = filters.search.toLowerCase();
      const clienteNome = p.cliente ? (p.cliente as { nome: string }).nome.toLowerCase() : '';
      if (s && !p.titulo.toLowerCase().includes(s) && !(p.materia || '').toLowerCase().includes(s) && !clienteNome.includes(s)) return false;
      if (filters.estado !== 'todos' && p.estado !== filters.estado) return false;
      if (filters.tipo !== 'todos' && p.tipo !== filters.tipo) return false;
      if (filters.clienteId !== 'todos' && p.cliente_id !== filters.clienteId) return false;
      if (filters.dateFrom) {
        const d = new Date(p.created_at);
        if (d < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const d = new Date(p.created_at);
        const end = new Date(filters.dateTo); end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [dossiers, filters]);

  const handleDelete = async () => {
    if (!deleting || !user) return;
    const { error } = await supabase.from('dossiers').delete().eq('id', deleting.id).eq('user_id', user.id);
    if (error) { toast.error('Erro ao eliminar'); return; }
    toast.success('Dossier eliminado');
    setDeleting(null);
    await fetchAll();
  };

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
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dossiers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{dossiers.length} dossier{dossiers.length !== 1 ? 's' : ''} no total</p>
          </div>
          <Button asChild>
            <Link to="/dossiers/novo"><Plus className="h-4 w-4 mr-2" />Novo Dossier</Link>
          </Button>
        </div>

        <ListFilters
          value={filters}
          onChange={setFilters}
          searchPlaceholder="Pesquisar por título, matéria ou cliente..."
          estados={Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label }))}
          tipos={TIPO_OPTIONS}
          clientes={clientes.map((c) => ({ value: c.id, label: c.nome }))}
          showDateRange
        />

        <QueryState
          loading={loading}
          error={error}
          empty={!loading && filtered.length === 0}
          emptyMessage={dossiers.length === 0 ? 'Nenhum dossier criado ainda' : 'Nenhum dossier corresponde aos filtros'}
          emptyAction={dossiers.length === 0 ? (
            <Button asChild variant="outline"><Link to="/dossiers/novo">Criar primeiro dossier</Link></Button>
          ) : undefined}
          onRetry={fetchAll}
          skeletonRows={4}
        >
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="border-border hover:border-foreground/20 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <Link to={`/dossiers/${p.id}`} className="block min-w-0 flex-1">
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
                    </Link>
                    <div className="flex items-start gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{formatarData(p.updated_at)}</p>
                        {counts[p.id] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {counts[p.id].factos} factos · {counts[p.id].documentos} docs
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); setEditing(p); }} aria-label="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.preventDefault(); setDeleting(p); }} aria-label="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </QueryState>
      </div>

      {editing && (
        <EditDossierDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          dossier={editing}
          onSaved={fetchAll}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Eliminar dossier"
        description={`Vais eliminar "${deleting?.titulo ?? ''}" e todos os factos, issues, regras e conclusões associadas. Esta acção é irreversível.`}
        confirmWord="ELIMINAR"
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
