import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Disciplina, Topico, Processo } from '@/types';

export default function DisciplinaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [processosAssociados, setProcessosAssociados] = useState<Processo[]>([]);
  const [todosProcessos, setTodosProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [topicoDialog, setTopicoDialog] = useState(false);
  const [editingTopico, setEditingTopico] = useState<Topico | null>(null);
  const [topicoForm, setTopicoForm] = useState({ nome: '', conteudo: '', referencias: '' });
  const [processDialog, setProcessDialog] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!id || !user) return;
    const [dRes, tRes, dpRes, pRes] = await Promise.all([
      supabase.from('disciplinas').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('topicos').select('*').eq('disciplina_id', id).order('nome'),
      supabase.from('disciplina_processos').select('*, processo:processos(id,titulo,tipo,estado,materia)').eq('disciplina_id', id),
      supabase.from('processos').select('id,titulo,tipo').eq('user_id', user.id).eq('tipo', 'academico').order('titulo'),
    ]);
    setDisciplina(dRes.data as Disciplina);
    setTopicos((tRes.data as Topico[]) || []);
    setProcessosAssociados((dpRes.data || []).map((dp: { processo: Processo }) => dp.processo));
    setTodosProcessos((pRes.data as Processo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  const handleSaveTopico = async () => {
    if (!topicoForm.nome.trim() || !id) return;
    setSaving(true);
    if (editingTopico) {
      await supabase.from('topicos').update({ nome: topicoForm.nome.trim(), conteudo: topicoForm.conteudo.trim() || null, referencias: topicoForm.referencias.trim() || null }).eq('id', editingTopico.id);
    } else {
      await supabase.from('topicos').insert({ disciplina_id: id, nome: topicoForm.nome.trim(), conteudo: topicoForm.conteudo.trim() || null, referencias: topicoForm.referencias.trim() || null });
    }
    await fetchAll();
    setSaving(false);
    setTopicoDialog(false);
  };

  const handleDeleteTopico = async (tid: string) => {
    if (!confirm('Eliminar este tópico?')) return;
    await supabase.from('topicos').delete().eq('id', tid);
    setTopicos(prev => prev.filter(t => t.id !== tid));
  };

  const handleAssociarProcesso = async () => {
    if (!selectedProcesso || !id) return;
    const exists = processosAssociados.find(p => p.id === selectedProcesso);
    if (!exists) {
      await supabase.from('disciplina_processos').insert({ disciplina_id: id, processo_id: selectedProcesso });
      await fetchAll();
    }
    setProcessDialog(false);
    setSelectedProcesso('');
  };

  const handleRemoverProcesso = async (processoId: string) => {
    if (!id) return;
    await supabase.from('disciplina_processos').delete().eq('disciplina_id', id).eq('processo_id', processoId);
    setProcessosAssociados(prev => prev.filter(p => p.id !== processoId));
  };

  if (loading) return <AppLayout><div className="p-6"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div></AppLayout>;
  if (!disciplina) return <AppLayout><div className="p-6 text-center"><p className="text-muted-foreground">Disciplina não encontrada.</p><Button asChild className="mt-4" variant="outline"><Link to="/conhecimento">Voltar</Link></Button></div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/conhecimento')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
            {disciplina.descricao && <p className="text-sm text-muted-foreground mt-0.5">{disciplina.descricao}</p>}
          </div>
        </div>

        <Tabs defaultValue="topicos">
          <TabsList className="h-auto border-b border-border rounded-none bg-transparent p-0 w-full justify-start">
            {['topicos', 'processos'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm">
                {tab === 'topicos' ? 'Tópicos' : 'Processos Associados'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="topicos" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{topicos.length} tópico{topicos.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={() => { setEditingTopico(null); setTopicoForm({ nome: '', conteudo: '', referencias: '' }); setTopicoDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />Novo Tópico
              </Button>
            </div>
            {topicos.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum tópico criado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topicos.map(t => (
                  <Card key={t.id} className="border-border group hover:border-foreground/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{t.nome}</h3>
                          {t.conteudo && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{t.conteudo}</p>}
                          {t.referencias && <p className="text-xs text-muted-foreground mt-2 italic">Ref: {t.referencias}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTopico(t); setTopicoForm({ nome: t.nome, conteudo: t.conteudo || '', referencias: t.referencias || '' }); setTopicoDialog(true); }}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTopico(t.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processos" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{processosAssociados.length} processo{processosAssociados.length !== 1 ? 's' : ''} associado{processosAssociados.length !== 1 ? 's' : ''}</p>
              <Button size="sm" onClick={() => setProcessDialog(true)}><Plus className="h-4 w-4 mr-1" />Associar Processo</Button>
            </div>
            {processosAssociados.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-sm">Nenhum processo académico associado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {processosAssociados.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card group">
                    <Link to={`/processos/${p.id}`} className="text-sm font-medium text-foreground hover:underline">{p.titulo}</Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleRemoverProcesso(p.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Tópico Dialog */}
      <Dialog open={topicoDialog} onOpenChange={setTopicoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingTopico ? 'Editar Tópico' : 'Novo Tópico'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={topicoForm.nome} onChange={e => setTopicoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do tópico" /></div>
            <div className="space-y-2"><Label>Conteúdo / Notas</Label><Textarea value={topicoForm.conteudo} onChange={e => setTopicoForm(f => ({ ...f, conteudo: e.target.value }))} placeholder="Notas sobre este tópico..." rows={5} /></div>
            <div className="space-y-2"><Label>Referências</Label><Textarea value={topicoForm.referencias} onChange={e => setTopicoForm(f => ({ ...f, referencias: e.target.value }))} placeholder="Artigos, livros, URLs..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTopico} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Associar Processo Dialog */}
      <Dialog open={processDialog} onOpenChange={setProcessDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Associar Processo Académico</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Processo</Label>
            <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Seleccionar processo..." /></SelectTrigger>
              <SelectContent>
                {todosProcessos.filter(p => !processosAssociados.find(pa => pa.id === p.id)).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssociarProcesso} disabled={!selectedProcesso}>Associar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
