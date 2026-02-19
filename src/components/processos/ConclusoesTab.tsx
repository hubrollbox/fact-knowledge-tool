import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CheckSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { CERTEZA_LABELS } from '@/lib/utils-fkt';
import type { Issue, Conclusao, GrauCerteza } from '@/types';

interface Props { processoId: string; }

export function ConclusoesTab({ processoId }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [conclusoes, setConclusoes] = useState<Conclusao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [editing, setEditing] = useState<Conclusao | null>(null);
  const [form, setForm] = useState({ resultado: '', grau_confianca: 'medio' as GrauCerteza, pontos_frageis: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const [iRes, cRes] = await Promise.all([
      supabase.from('issues').select('*').eq('processo_id', processoId).order('created_at'),
      supabase.from('conclusoes').select('*').in('issue_id',
        (await supabase.from('issues').select('id').eq('processo_id', processoId)).data?.map(i => i.id) || []
      ),
    ]);
    setIssues((iRes.data as Issue[]) || []);
    setConclusoes((cRes.data as Conclusao[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [processoId]);

  const getConclusao = (issueId: string) => conclusoes.find(c => c.issue_id === issueId);

  const openNew = (issue: Issue) => {
    setSelectedIssue(issue);
    setEditing(null);
    setForm({ resultado: '', grau_confianca: 'medio', pontos_frageis: '' });
    setDialogOpen(true);
  };

  const openEdit = (issue: Issue, conclusao: Conclusao) => {
    setSelectedIssue(issue);
    setEditing(conclusao);
    setForm({ resultado: conclusao.resultado, grau_confianca: conclusao.grau_confianca, pontos_frageis: conclusao.pontos_frageis || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedIssue || !form.resultado.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from('conclusoes').update({ resultado: form.resultado.trim(), grau_confianca: form.grau_confianca, pontos_frageis: form.pontos_frageis.trim() || null }).eq('id', editing.id);
    } else {
      await supabase.from('conclusoes').insert({ issue_id: selectedIssue.id, resultado: form.resultado.trim(), grau_confianca: form.grau_confianca, pontos_frageis: form.pontos_frageis.trim() || null });
    }
    await fetchAll();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta conclusão?')) return;
    await supabase.from('conclusoes').delete().eq('id', id);
    setConclusoes(prev => prev.filter(c => c.id !== id));
  };

  const totalIssues = issues.length;
  const issuessComConclusao = issues.filter(i => getConclusao(i.id)).length;
  const issuesAbertas = issues.filter(i => i.estado === 'aberta').length;
  const podeConclui = totalIssues > 0 && issuessComConclusao === totalIssues && issuesAbertas === 0;

  return (
    <div className="space-y-4">
      {/* Progresso */}
      <div className="p-4 border border-border rounded-lg bg-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">Completude do Processo</p>
          <span className="text-sm text-muted-foreground">{issuessComConclusao}/{totalIssues} issues concluídas</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-foreground rounded-full transition-all" style={{ width: totalIssues ? `${(issuessComConclusao / totalIssues) * 100}%` : '0%' }} />
        </div>
        {podeConclui ? (
          <p className="text-xs text-foreground mt-2 flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Processo pode ser marcado como concluído</p>
        ) : issuesAbertas > 0 ? (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {issuesAbertas} issue{issuesAbertas !== 1 ? 's' : ''} ainda aberta{issuesAbertas !== 1 ? 's' : ''}</p>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">Crie issues primeiro para adicionar conclusões</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => {
            const conclusao = getConclusao(issue.id);
            return (
              <div key={issue.id} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">{issue.descricao}</p>
                    {conclusao ? (
                      <div className="mt-3 space-y-2">
                        <div className="border-l-2 border-foreground pl-3">
                          <p className="text-sm text-foreground">{conclusao.resultado}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Confiança: {CERTEZA_LABELS[conclusao.grau_confianca]}</span>
                          </div>
                          {conclusao.pontos_frageis && (
                            <p className="text-xs text-muted-foreground mt-1 italic">⚠️ {conclusao.pontos_frageis}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(issue, conclusao)}>
                            <Pencil className="h-3 w-3 mr-1" />Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(conclusao.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />Eliminar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => openNew(issue)}>
                        <Plus className="h-3 w-3 mr-1" />Adicionar conclusão
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conclusão' : 'Nova Conclusão'}</DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground font-medium mb-1">Issue</p>
                <p className="text-sm text-foreground">{selectedIssue.descricao}</p>
              </div>
              <div className="space-y-2">
                <Label>Resultado / Conclusão *</Label>
                <Textarea value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))} placeholder="Conclusão sobre esta issue..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Grau de Confiança</Label>
                <Select value={form.grau_confianca} onValueChange={v => setForm(f => ({ ...f, grau_confianca: v as GrauCerteza }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CERTEZA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pontos Frágeis</Label>
                <Textarea value={form.pontos_frageis} onChange={e => setForm(f => ({ ...f, pontos_frageis: e.target.value }))} placeholder="Aspectos que podem enfraquecer esta conclusão..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
