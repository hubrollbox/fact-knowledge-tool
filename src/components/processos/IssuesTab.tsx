import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { PRIORIDADE_LABELS } from '@/lib/utils-fkt';
import type { Issue, IssuePrioridade, IssueEstado } from '@/types';

interface Props { processoId: string; }

const emptyForm = { descricao: '', prioridade: 'media' as IssuePrioridade, estado: 'aberta' as IssueEstado };

export function IssuesTab({ processoId }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('issues').select('*').eq('processo_id', processoId).order('created_at', { ascending: true });
    setIssues((data as Issue[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [processoId]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: Issue) => {
    setEditing(i);
    setForm({ descricao: i.descricao, prioridade: i.prioridade, estado: i.estado });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from('issues').update({ descricao: form.descricao.trim(), prioridade: form.prioridade, estado: form.estado }).eq('id', editing.id);
    } else {
      await supabase.from('issues').insert({ processo_id: processoId, descricao: form.descricao.trim(), prioridade: form.prioridade, estado: form.estado });
    }
    await fetch();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta issue?')) return;
    await supabase.from('issues').delete().eq('id', id);
    setIssues(prev => prev.filter(i => i.id !== id));
  };

  const prioridadeColor: Record<string, string> = {
    alta: 'bg-foreground text-background',
    media: 'bg-muted text-foreground border border-border',
    baixa: 'bg-muted/50 text-muted-foreground border border-border',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{issues.length} issue{issues.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Issue</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">Nenhuma issue registada</p>
          <Button size="sm" className="mt-3" onClick={openNew}>Adicionar primeira issue</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map(issue => (
            <div key={issue.id} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card group hover:border-foreground/20 transition-colors">
              <div className="mt-0.5">
                {issue.estado === 'resolvida'
                  ? <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  : <AlertCircle className="h-4 w-4 text-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${issue.estado === 'resolvida' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {issue.descricao}
                </p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${prioridadeColor[issue.prioridade]}`}>
                    {PRIORIDADE_LABELS[issue.prioridade]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border border-border ${issue.estado === 'resolvida' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {issue.estado === 'aberta' ? 'Aberta' : 'Resolvida'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(issue)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(issue.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Issue' : 'Nova Issue'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Qual é a questão jurídica ou factual a resolver?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v as IssuePrioridade }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v as IssueEstado }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
