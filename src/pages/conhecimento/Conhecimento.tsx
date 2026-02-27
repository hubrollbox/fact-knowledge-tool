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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatarData } from '@/lib/utils-fkt';
import type { Disciplina } from '@/types';

export default function Conhecimento() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    docente: '',
    docente_telm: '',
    docente_email: '',
    regente: '',
    regente_telm: '',
    regente_email: '',
  });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('disciplinas')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      setDisciplinas((data as Disciplina[]) || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast({
        title: 'Erro ao carregar disciplinas',
        description: 'Não foi possível carregar as disciplinas. Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({
      nome: '',
      descricao: '',
      docente: '',
      docente_telm: '',
      docente_email: '',
      regente: '',
      regente_telm: '',
      regente_email: '',
    });
    setDialogOpen(true);
  };
  const openEdit = (d: Disciplina) => {
    setEditing(d);
    setForm({
      nome: d.nome,
      descricao: d.descricao || '',
      docente: d.docente || '',
      docente_telm: d.docente_telm || '',
      docente_email: d.docente_email || '',
      regente: d.regente || '',
      regente_telm: d.regente_telm || '',
      regente_email: d.regente_email || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    setSaving(true);
    const disciplinaPayload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      docente: form.docente.trim() || null,
      docente_telm: form.docente_telm.trim() || null,
      docente_email: form.docente_email.trim() || null,
      regente: form.regente.trim() || null,
      regente_telm: form.regente_telm.trim() || null,
      regente_email: form.regente_email.trim() || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('disciplinas').update(disciplinaPayload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('disciplinas').insert({ user_id: user.id, ...disciplinaPayload });
        if (error) throw error;
      }

      await fetch();
      setDialogOpen(false);
      toast({ title: editing ? 'Disciplina atualizada' : 'Disciplina criada' });
    } catch (error) {
      console.error('Erro ao guardar disciplina:', error);
      toast({
        title: 'Erro ao guardar disciplina',
        description: 'Não foi possível guardar a disciplina. Verifica as permissões e tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta disciplina e todos os seus tópicos?')) return;
    try {
      const { error } = await supabase.from('disciplinas').delete().eq('id', id);
      if (error) throw error;

      setDisciplinas(prev => prev.filter(d => d.id !== id));
      toast({ title: 'Disciplina eliminada' });
    } catch (error) {
      console.error('Erro ao eliminar disciplina:', error);
      toast({
        title: 'Erro ao eliminar disciplina',
        description: 'Não foi possível eliminar a disciplina. Tenta novamente.',
        variant: 'destructive',
      });
    }
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
            <div className="space-y-2">
              <Label>Docente</Label>
              <Input value={form.docente} onChange={e => setForm(f => ({ ...f, docente: e.target.value }))} placeholder="Nome do docente" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contacto telm. (Docente)</Label>
                <Input value={form.docente_telm} onChange={e => setForm(f => ({ ...f, docente_telm: e.target.value }))} placeholder="+351 9xx xxx xxx" />
              </div>
              <div className="space-y-2">
                <Label>Email (Docente)</Label>
                <Input type="email" value={form.docente_email} onChange={e => setForm(f => ({ ...f, docente_email: e.target.value }))} placeholder="docente@exemplo.pt" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Regente</Label>
              <Input value={form.regente} onChange={e => setForm(f => ({ ...f, regente: e.target.value }))} placeholder="Nome do regente" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contacto telm. (Regente)</Label>
                <Input value={form.regente_telm} onChange={e => setForm(f => ({ ...f, regente_telm: e.target.value }))} placeholder="+351 9xx xxx xxx" />
              </div>
              <div className="space-y-2">
                <Label>Email (Regente)</Label>
                <Input type="email" value={form.regente_email} onChange={e => setForm(f => ({ ...f, regente_email: e.target.value }))} placeholder="regente@exemplo.pt" />
              </div>
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
