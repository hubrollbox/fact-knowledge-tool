import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { validarFacto, formatarData, CERTEZA_LABELS } from '@/lib/utils-fkt';
import { formatDatabaseError } from '@/lib/error-utils';
import type { Facto, GrauCerteza } from '@/types';

interface Props { processoId: string; }

const emptyForm = { descricao: '', data_facto: '', grau_certeza: 'medio' as GrauCerteza, observacoes: '' };

export function FactosTab({ processoId }: Props) {
  const [factos, setFactos] = useState<Facto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Facto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetch = async () => {
    const { data, error } = await supabase
      .from('factos')
      .select('*')
      .eq('processo_id', processoId)
      .order('data_facto', { ascending: true, nullsFirst: false });

    if (error) {
      setLoadError(formatDatabaseError(error));
      setFactos([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    setFactos((data as Facto[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [processoId]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormError(null); setDialogOpen(true); };
  const openEdit = (f: Facto) => {
    setEditing(f);
    setForm({ descricao: f.descricao, data_facto: f.data_facto || '', grau_certeza: f.grau_certeza, observacoes: f.observacoes || '' });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const err = validarFacto(form.descricao);
    if (err) { setFormError(err); return; }
    if (!form.descricao.trim()) { setFormError('A descrição é obrigatória.'); return; }
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from('factos').update({
        descricao: form.descricao.trim(),
        data_facto: form.data_facto || null,
        grau_certeza: form.grau_certeza,
        observacoes: form.observacoes.trim() || null,
      }).eq('id', editing.id);
      if (error) {
        setFormError(formatDatabaseError(error));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('factos').insert({
        processo_id: processoId,
        descricao: form.descricao.trim(),
        data_facto: form.data_facto || null,
        grau_certeza: form.grau_certeza,
        observacoes: form.observacoes.trim() || null,
      });
      if (error) {
        setFormError(formatDatabaseError(error));
        setSaving(false);
        return;
      }
    }

    await fetch();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este facto?')) return;
    const { error } = await supabase.from('factos').delete().eq('id', id);
    if (error) {
      alert(formatDatabaseError(error));
      return;
    }
    setFactos(prev => prev.filter(f => f.id !== id));
  };

  const certezaBadge = (c: string) => {
    const colors: Record<string, string> = {
      alto: 'bg-foreground text-background',
      medio: 'bg-muted text-foreground border border-border',
      baixo: 'bg-muted text-muted-foreground border border-border',
      desconhecido: 'bg-muted/50 text-muted-foreground',
    };
    return <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[c] || ''}`}>{CERTEZA_LABELS[c] || c}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{factos.length} facto{factos.length !== 1 ? 's' : ''} registado{factos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Facto</Button>
      </div>

      {loadError && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : factos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">Nenhum facto registado</p>
          <Button size="sm" className="mt-3" onClick={openNew}>Adicionar primeiro facto</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {factos.map((f, i) => (
            <div key={f.id} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className="h-6 w-6 rounded-full border-2 border-border bg-background flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {i + 1}
                </div>
                {i < factos.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pb-4 border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{f.descricao}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {f.data_facto && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />{formatarData(f.data_facto)}
                        </span>
                      )}
                      {certezaBadge(f.grau_certeza)}
                    </div>
                    {f.observacoes && <p className="text-xs text-muted-foreground mt-2 italic">{f.observacoes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Facto' : 'Novo Facto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o facto de forma objectiva e neutra..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">⚠️ Evite termos conclusivos como "erro", "culpa", "conforme".</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do Facto</Label>
                <Input type="date" value={form.data_facto} onChange={e => setForm(f => ({ ...f, data_facto: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Grau de Certeza</Label>
                <Select value={form.grau_certeza} onValueChange={v => setForm(f => ({ ...f, grau_certeza: v as GrauCerteza }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CERTEZA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..." rows={2} />
            </div>
            {formError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{formError}</p>}
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
