import { useState, useEffect } from 'react';
import { Plus, Trash2, Link2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { Application, Issue, Rule, Facto, ApplicationTipo } from '@/types';

interface Props { processoId: string; }

const emptyForm = { issue_id: '', rule_id: '', argumento: '', tipo: 'pro' as ApplicationTipo, factos_ids: [] as string[] };

export function ApplicationsTab({ processoId }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [factos, setFactos] = useState<Facto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAll = async () => {
    const [aRes, iRes, rRes, fRes] = await Promise.all([
      supabase.from('applications').select('*, issue:issues(id,descricao), rule:rules(id,referencia), application_factos(id,facto_id,facto:factos(id,descricao,data_facto))').eq('processo_id', processoId).order('created_at', { ascending: true }),
      supabase.from('issues').select('*').eq('processo_id', processoId),
      supabase.from('rules').select('*').eq('processo_id', processoId),
      supabase.from('factos').select('*').eq('processo_id', processoId).order('data_facto', { ascending: true }),
    ]);
    setApplications((aRes.data as Application[]) || []);
    setIssues((iRes.data as Issue[]) || []);
    setRules((rRes.data as Rule[]) || []);
    setFactos((fRes.data as Facto[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [processoId]);

  const handleSave = async () => {
    if (!form.issue_id || !form.rule_id || !form.argumento.trim()) { setFormError('Issue, norma e argumento são obrigatórios.'); return; }
    if (form.factos_ids.length === 0) { setFormError('Deve seleccionar pelo menos um facto.'); return; }
    setSaving(true);
    setFormError(null);

    const { data: app } = await supabase.from('applications').insert({
      processo_id: processoId,
      issue_id: form.issue_id,
      rule_id: form.rule_id,
      argumento: form.argumento.trim(),
      tipo: form.tipo,
    }).select().single();

    if (app) {
      await supabase.from('application_factos').insert(
        form.factos_ids.map(fid => ({ application_id: app.id, facto_id: fid }))
      );
    }

    await fetchAll();
    setSaving(false);
    setDialogOpen(false);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta application?')) return;
    await supabase.from('application_factos').delete().eq('application_id', id);
    await supabase.from('applications').delete().eq('id', id);
    setApplications(prev => prev.filter(a => a.id !== id));
  };

  const toggleFacto = (id: string) => {
    setForm(f => ({
      ...f,
      factos_ids: f.factos_ids.includes(id) ? f.factos_ids.filter(fid => fid !== id) : [...f.factos_ids, id]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setForm(emptyForm); setFormError(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Nova Application
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Nenhuma application criada</p>
          <p className="text-xs text-muted-foreground mt-1">Crie applications para ligar Issues a Normas com argumentos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const issue = app.issue as unknown as { descricao: string };
            const rule = app.rule as unknown as { referencia: string };
            const appFactos = (app.application_factos || []) as Array<{ facto: { descricao: string; data_facto: string | null } }>;
            return (
              <div key={app.id} className="p-4 border border-border rounded-lg bg-card group hover:border-foreground/20 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {/* Chain visual */}
                    <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                      <span className="bg-muted px-2 py-1 rounded text-foreground truncate max-w-[180px]" title={issue?.descricao}>{issue?.descricao}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <code className="bg-muted px-2 py-1 rounded font-mono">{rule?.referencia}</code>
                      <span className={`px-2 py-1 rounded font-medium ${app.tipo === 'pro' ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'}`}>
                        {app.tipo === 'pro' ? 'Pró' : 'Contra'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{app.argumento}</p>
                    {appFactos.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Factos envolvidos:</p>
                        <div className="flex flex-wrap gap-1">
                          {appFactos.map((af, i) => (
                            <span key={i} className="text-xs bg-muted/50 border border-border px-2 py-0.5 rounded truncate max-w-[200px]" title={af.facto?.descricao}>
                              {af.facto?.descricao}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(app.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Application</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Issue *</Label>
              <Select value={form.issue_id} onValueChange={v => setForm(f => ({ ...f, issue_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar issue..." /></SelectTrigger>
                <SelectContent>
                  {issues.map(i => <SelectItem key={i.id} value={i.id}>{i.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Norma (Rule) *</Label>
              <Select value={form.rule_id} onValueChange={v => setForm(f => ({ ...f, rule_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar norma..." /></SelectTrigger>
                <SelectContent>
                  {rules.map(r => <SelectItem key={r.id} value={r.id}>{r.referencia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as ApplicationTipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pró (suporta)</SelectItem>
                  <SelectItem value="contra">Contra (refuta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Argumento *</Label>
              <Textarea value={form.argumento} onChange={e => setForm(f => ({ ...f, argumento: e.target.value }))} placeholder="Descreva o argumento jurídico..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Factos envolvidos * (mín. 1)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-md p-3">
                {factos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum facto disponível. Crie factos primeiro.</p>
                ) : factos.map(f => (
                  <div key={f.id} className="flex items-start gap-2">
                    <Checkbox
                      id={f.id}
                      checked={form.factos_ids.includes(f.id)}
                      onCheckedChange={() => toggleFacto(f.id)}
                    />
                    <label htmlFor={f.id} className="text-xs text-foreground cursor-pointer leading-relaxed">{f.descricao}</label>
                  </div>
                ))}
              </div>
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
