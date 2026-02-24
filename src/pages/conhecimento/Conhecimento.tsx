import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatarData } from '@/lib/utils-fkt';
import type { Disciplina } from '@/types';

export default function Conhecimento() {
  const { user } = useAuth();
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from('disciplinas').select('*').eq('user_id', user.id).order('nome');
    setDisciplinas((data as Disciplina[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const openNew = () => { setEditing(null); setForm({ nome: '', descricao: '' }); setDialogOpen(true); };
  const openEdit = (d: Disciplina) => { setEditing(d); setForm({ nome: d.nome, descricao: d.descricao || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    setSaving(true);
    if (editing) {
      await supabase.from('disciplinas').update({ nome: form.nome.trim(), descricao: form.descricao.trim() || null }).eq('id', editing.id);
    } else {
      await supabase.from('disciplinas').insert({ user_id: user.id, nome: form.nome.trim(), descricao: form.descricao.trim() || null });
    }
    await fetch();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta disciplina e todos os seus tópicos?')) return;
    await supabase.from('disciplinas').delete().eq('id', id);
    setDisciplinas(prev => prev.filter(d => d.id !== id));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Conhecimento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{disciplinas.length} disciplina{disciplinas.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Disciplina</Button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : disciplinas.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma disciplina criada ainda</p>
            <Button className="mt-4" onClick={openNew}>Criar primeira disciplina</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {disciplinas.map(d => (
              <Card key={d.id} className="border-border hover:border-foreground/20 transition-colors group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <Link to={`/conhecimento/disciplinas/${d.id}`} className="block">
                        <h3 className="font-semibold text-foreground hover:underline flex items-center gap-1">
                          {d.nome} <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </h3>
                      </Link>
                      {d.descricao && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{d.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-2">{formatarData(d.created_at)}</p>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Disciplina' : 'Nova Disciplina'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Direito Civil" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição da disciplina..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
