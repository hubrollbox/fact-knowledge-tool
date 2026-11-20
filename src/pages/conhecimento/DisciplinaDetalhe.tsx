import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Mail, Phone } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
  const [searchQuery, setSearchQuery] = useState('');

  const [topicoDialog, setTopicoDialog] = useState(false);
  const [editingTopico, setEditingTopico] = useState<Topico | null>(null);
  const [topicoForm, setTopicoForm] = useState({ nome: '', conteudo: '', referencias: '' });
  const [processDialog, setProcessDialog] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState('');

  const fetchAll = async () => {
    if (!id || !user) return;
    try {
      const [dRes, tRes, dpRes, pRes] = await Promise.all([
        supabase.from('disciplinas').select('*').eq('id', id).eq('user_id', user.id).single(),
        supabase.from('topicos').select('*').eq('disciplina_id', id).order('nome'),
        supabase.from('disciplina_processos').select('*, processo:dossiers(id,titulo,tipo,estado,materia)').eq('disciplina_id', id),
        supabase.from('dossiers').select('id,titulo,tipo').eq('user_id', user.id).eq('tipo', 'academico').order('titulo'),
      ]);
      if (dRes.error) throw dRes.error;
      setDisciplina(dRes.data as Disciplina);
      setTopicos((tRes.data as Topico[]) || []);
      setProcessosAssociados((dpRes.data || []).map((dp: any) => dp.processo));
      setTodosProcessos((pRes.data as unknown as Processo[]) || []);
    } catch {
      toast.error('Erro ao carregar disciplina');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  const handleSaveTopico = async () => {
    if (!topicoForm.nome.trim()) return;
    try {
      const updateData = {
        nome: topicoForm.nome.trim(),
        conteudo: topicoForm.conteudo.trim() || null,
        referencias: topicoForm.referencias.trim() || null,
      };
      if (editingTopico) {
        const { error } = await supabase.from('topicos').update(updateData).eq('id', editingTopico.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('topicos').insert({ ...updateData, disciplina_id: id });
        if (error) throw error;
      }
      await fetchAll();
      setTopicoDialog(false);
      setEditingTopico(null);
      setTopicoForm({ nome: '', conteudo: '', referencias: '' });
    } catch {
      toast.error('Erro ao guardar tópico');
    }
  };

  const handleDeleteTopico = async (tid: string) => {
    if (!confirm('Eliminar este tópico?')) return;
    try {
      const { error } = await supabase.from('topicos').delete().eq('id', tid);
      if (error) throw error;
      await fetchAll();
    } catch {
      toast.error('Erro ao eliminar tópico');
    }
  };

  const handleAssociarProcesso = async () => {
    if (!selectedProcesso) return;
    try {
      const { error } = await supabase.from('disciplina_processos').insert({ disciplina_id: id, dossier_id: selectedProcesso });
      if (error) throw error;
      await fetchAll();
      setProcessDialog(false);
      setSelectedProcesso('');
    } catch {
      toast.error('Erro ao associar dossier');
    }
  };

  const filteredTopicos = topicos.filter(t => t.nome.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredBibliografia = filteredTopicos.filter(t => t.referencias && t.referencias.trim());

  if (loading) return <AppLayout><div className="p-6 max-w-6xl mx-auto"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div></AppLayout>;
  if (!disciplina) return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto text-center">
        <p className="text-muted-foreground">Disciplina não encontrada.</p>
        <Button asChild className="mt-4" variant="outline"><Link to="/conhecimento">Voltar</Link></Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/conhecimento')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
              {disciplina.descricao && <p className="text-sm text-muted-foreground mt-0.5">{disciplina.descricao}</p>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{topicos.length} tópicos</p>
        </div>

        <Input
          placeholder="Buscar tópicos..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />

        <Tabs defaultValue="topicos">
          <TabsList className="h-auto border-b border-border rounded-none bg-transparent p-0 w-full justify-start overflow-x-auto">
            {[
              { value: 'topicos', label: 'Tópicos' },
              { value: 'processos', label: 'Dossiers' },
              { value: 'bibliografia', label: 'Bibliografia' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground px-4 py-2 text-sm min-w-max">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* TÓPICOS */}
          <TabsContent value="topicos" className="mt-6 space-y-4">
            {filteredTopicos.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum tópico encontrado.</p>
            )}
            {filteredTopicos.map(t => (
              <Card key={t.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{t.nome}</h3>
                      {t.conteudo && <p className="text-sm text-muted-foreground mt-1">{t.conteudo}</p>}
                      {t.referencias && <p className="text-xs text-muted-foreground mt-1 italic">{t.referencias}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingTopico(t);
                        setTopicoForm({ nome: t.nome, conteudo: t.conteudo || '', referencias: t.referencias || '' });
                        setTopicoDialog(true);
                      }}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTopico(t.id)}>Remover</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => { setEditingTopico(null); setTopicoForm({ nome: '', conteudo: '', referencias: '' }); setTopicoDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Tópico
            </Button>
          </TabsContent>

          {/* DOSSIERS */}
          <TabsContent value="processos" className="mt-6 space-y-4">
            {processosAssociados.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum dossier associado.</p>
            )}
            {processosAssociados.map(p => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.titulo}</p>
                    {p.materia && <p className="text-xs text-muted-foreground">{p.materia}</p>}
                  </div>
                  <Badge variant="outline">{p.estado}</Badge>
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => setProcessDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Associar Dossier
            </Button>
          </TabsContent>

          {/* BIBLIOGRAFIA */}
          <TabsContent value="bibliografia" className="mt-6 space-y-4">
            {filteredBibliografia.length === 0 && (
              <p className="text-muted-foreground text-sm">Sem referências bibliográficas nesta disciplina.</p>
            )}
            {filteredBibliografia.map(t => (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium">{t.nome}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.referencias}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Tópico */}
      <Dialog open={topicoDialog} onOpenChange={setTopicoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopico ? 'Editar Tópico' : 'Novo Tópico'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={topicoForm.nome} onChange={e => setTopicoForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Conteúdo</Label><Textarea value={topicoForm.conteudo} onChange={e => setTopicoForm(f => ({ ...f, conteudo: e.target.value }))} rows={4} /></div>
            <div><Label>Referências</Label><Input value={topicoForm.referencias} onChange={e => setTopicoForm(f => ({ ...f, referencias: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTopico} disabled={!topicoForm.nome.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Associar Dossier */}
      <Dialog open={processDialog} onOpenChange={setProcessDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Associar Dossier Académico</DialogTitle></DialogHeader>
          <div>
            <Label>Dossier</Label>
            <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
              <SelectTrigger><SelectValue placeholder="Selecionar dossier" /></SelectTrigger>
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
