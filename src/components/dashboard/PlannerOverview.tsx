import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, Clock, AlertTriangle, CalendarDays, Minus, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useActions } from '@/hooks/useActions';
import { useDossiers } from '@/hooks/useDossiers';
import type { Action } from '@/types';

function groupActions(actions: Action[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const atrasado: Action[] = [];
  const hoje: Action[] = [];
  const proximos: Action[] = [];
  const semData: Action[] = [];

  for (const a of actions) {
    if (a.estado === 'concluido') continue;
    if (!a.data) { semData.push(a); continue; }
    if (a.data < todayStr) atrasado.push(a);
    else if (a.data === todayStr) hoje.push(a);
    else proximos.push(a);
  }

  return { atrasado, hoje, proximos, semData };
}

const estadoLabels: Record<string, string> = {
  ativo: 'Ativo',
  a_aguardar: 'A Aguardar',
  concluido: 'Concluído',
};

export function PlannerOverview() {
  const { actions, loading, completeAction, updateAction, createAction } = useActions();
  const { dossiers } = useDossiers();
  const [editDialog, setEditDialog] = useState(false);
  const [newDialog, setNewDialog] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [form, setForm] = useState({ titulo: '', data: '', estado: 'ativo', dossier_id: '' });

  const { atrasado, hoje, proximos, semData } = groupActions(actions);
  const totalActive = atrasado.length + hoje.length + proximos.length + semData.length;

  const openEdit = (action: Action) => {
    setEditingAction(action);
    setForm({ titulo: action.titulo, data: action.data || '', estado: action.estado, dossier_id: action.dossier_id });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAction) return;
    await updateAction(editingAction.id, {
      titulo: form.titulo.trim(),
      data: form.data || null,
      estado: form.estado,
    });
    setEditDialog(false);
  };

  const openNew = () => {
    setForm({ titulo: '', data: '', estado: 'ativo', dossier_id: '' });
    setNewDialog(true);
  };

  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.dossier_id) return;
    await createAction(form.dossier_id, form.titulo, form.data || undefined);
    setNewDialog(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  const renderGroup = (label: string, items: Action[], icon: React.ReactNode, colorClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${colorClass}`}>
          {icon}
          {label} ({items.length})
        </div>
        {items.map(action => (
          <div key={action.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-card border border-border hover:border-foreground/20 transition-colors group">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => completeAction(action.id)}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Link to={`/dossiers/${action.dossier_id}`} className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium shrink-0">
                {(action.dossier as any)?.titulo || '—'}
              </span>
              <Minus className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{action.titulo}</span>
              {action.data && (
                <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatDate(action.data)}</span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground"
              onClick={() => openEdit(action)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Planner
          {totalActive > 0 && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-normal">{totalActive}</span>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" />Nova Ação
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
          </div>
        ) : totalActive === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sem ações pendentes</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={openNew}>Criar ação</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {renderGroup('Atrasado', atrasado, <AlertTriangle className="h-3.5 w-3.5" />, 'text-destructive')}
            {renderGroup('Hoje', hoje, <Clock className="h-3.5 w-3.5" />, 'text-foreground')}
            {renderGroup('Próximos', proximos, <CalendarDays className="h-3.5 w-3.5" />, 'text-muted-foreground')}
            {renderGroup('Sem data', semData, <Minus className="h-3.5 w-3.5" />, 'text-muted-foreground')}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data (prazo)</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(estadoLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Action Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Ação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Dossier *</Label>
              <Select value={form.dossier_id} onValueChange={v => setForm(f => ({ ...f, dossier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar dossier..." /></SelectTrigger>
                <SelectContent>
                  {dossiers.filter(d => d.estado !== 'arquivado').map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Rever landing page" />
            </div>
            <div className="space-y-2">
              <Label>Data (prazo)</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.titulo.trim() || !form.dossier_id}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
