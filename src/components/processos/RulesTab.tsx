import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { formatarData } from '@/lib/utils-fkt';
import type { Rule } from '@/types';

interface Props { processoId: string; }

const emptyForm = { referencia: '', texto: '', vigencia_inicio: '', vigencia_fim: '', fonte: '' };

export function RulesTab({ processoId }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('rules').select('*').eq('processo_id', processoId).order('created_at', { ascending: true });
    setRules((data as Rule[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [processoId]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({ referencia: r.referencia, texto: r.texto, vigencia_inicio: r.vigencia_inicio || '', vigencia_fim: r.vigencia_fim || '', fonte: r.fonte || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.referencia.trim() || !form.texto.trim()) return;
    setSaving(true);
    const payload = {
      referencia: form.referencia.trim(),
      texto: form.texto.trim(),
      vigencia_inicio: form.vigencia_inicio || null,
      vigencia_fim: form.vigencia_fim || null,
      fonte: form.fonte.trim() || null,
    };
    if (editing) {
      await supabase.from('rules').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('rules').insert({ ...payload, processo_id: processoId });
    }
    await fetch();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta norma?')) return;
    await supabase.from('rules').delete().eq('id', id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} norma{rules.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Norma</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Nenhuma norma registada</p>
          <Button size="sm" className="mt-3" onClick={openNew}>Adicionar norma</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="p-4 border border-border rounded-lg bg-card group hover:border-foreground/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">{rule.referencia}</code>
                    {rule.fonte && <span className="text-xs text-muted-foreground">{rule.fonte}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{rule.texto}</p>
                  {(rule.vigencia_inicio || rule.vigencia_fim) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Vigência: {rule.vigencia_inicio ? formatarData(rule.vigencia_inicio) : '?'} → {rule.vigencia_fim ? formatarData(rule.vigencia_fim) : 'presente'}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Norma' : 'Nova Norma'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Referência *</Label>
              <Input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Ex: Art. 483º CC" />
            </div>
            <div className="space-y-2">
              <Label>Texto da norma *</Label>
              <Textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} placeholder="Transcrição ou resumo da norma..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vigência início</Label>
                <Input type="date" value={form.vigencia_inicio} onChange={e => setForm(f => ({ ...f, vigencia_inicio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vigência fim</Label>
                <Input type="date" value={form.vigencia_fim} onChange={e => setForm(f => ({ ...f, vigencia_fim: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Input value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))} placeholder="Ex: Código Civil, DR Série I..." />
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
