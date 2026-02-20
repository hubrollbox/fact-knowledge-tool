import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Search, MessageSquare, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Disciplina, Topico, Processo } from '@/types';

interface TopicoExtended extends Topico {
  completado?: boolean;
  video_url?: string;
}

interface Quiz {
  id: string;
  topico_id: string;
  pergunta: string;
  opcoes: string[];
  resposta_correta: number;
}

interface Discussao {
  id: string;
  topico_id: string;
  comentario: string;
  user_id: string;
}

interface Progresso {
  topico_id: string;
  completado: boolean;
}

export default function DisciplinaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [topicos, setTopicos] = useState<TopicoExtended[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [discussoes, setDiscussoes] = useState<Discussao[]>([]);
  const [progressos, setProgressos] = useState<Progresso[]>([]);
  const [processosAssociados, setProcessosAssociados] = useState<Processo[]>([]);
  const [todosProcessos, setTodosProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [topicoDialog, setTopicoDialog] = useState(false);
  const [editingTopico, setEditingTopico] = useState<TopicoExtended | null>(null);
  const [topicoForm, setTopicoForm] = useState({ nome: '', conteudo: '', referencias: '', video_url: '' });
  const [quizDialog, setQuizDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({ pergunta: '', opcoes: ['', '', '', ''], resposta_correta: 0, topico_id: '' });
  const [discussaoDialog, setDiscussaoDialog] = useState(false);
  const [discussaoForm, setDiscussaoForm] = useState({ comentario: '', topico_id: '' });
  const [processDialog, setProcessDialog] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});

  const fetchAll = async () => {
    if (!id || !user) return;
    const [dRes, tRes, qRes, discRes, progRes, dpRes, pRes] = await Promise.all([
      supabase.from('disciplinas').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('topicos').select('*').eq('disciplina_id', id).order('nome'),
      supabase.from('quizzes').select('*').eq('disciplina_id', id),
      supabase.from('discussoes').select('*').eq('disciplina_id', id),
      supabase.from('progressos').select('*').eq('user_id', user.id).eq('disciplina_id', id),
      supabase.from('disciplina_processos').select('*, processo:processos(id,titulo,tipo,estado,materia)').eq('disciplina_id', id),
      supabase.from('processos').select('id,titulo,tipo').eq('user_id', user.id).eq('tipo', 'academico').order('titulo'),
    ]);
    setDisciplina(dRes.data as Disciplina);
    setTopicos((tRes.data as TopicoExtended[]) || []);
    setQuizzes((qRes.data as Quiz[]) || []);
    setDiscussoes((discRes.data as Discussao[]) || []);
    setProgressos((progRes.data as Progresso[]) || []);
    setProcessosAssociados((dpRes.data || []).map((dp: { processo: Processo }) => dp.processo));
    setTodosProcessos((pRes.data as Processo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  const handleSaveTopico = async () => {
    const updateData = {
      nome: topicoForm.nome.trim(),
      conteudo: topicoForm.conteudo.trim() || null,
      referencias: topicoForm.referencias.trim() || null,
      video_url: topicoForm.video_url.trim() || null,
    };
    if (editingTopico) {
      await supabase.from('topicos').update(updateData).eq('id', editingTopico.id);
    } else {
      await supabase.from('topicos').insert({ ...updateData, disciplina_id: id });
    }
    await fetchAll();
    setTopicoDialog(false);
    setEditingTopico(null);
    setTopicoForm({ nome: '', conteudo: '', referencias: '', video_url: '' });
  };

  const handleDeleteTopico = async (tid: string) => {
    await supabase.from('topicos').delete().eq('id', tid);
    await fetchAll();
  };

  const handleToggleCompletado = async (tid: string, completado: boolean) => {
    await supabase.from('progressos').upsert({ topico_id: tid, user_id: user?.id, completado, disciplina_id: id }, { onConflict: 'topico_id,user_id' });
    await fetchAll();
  };

  const handleSaveQuiz = async () => {
    const updateData = {
      pergunta: quizForm.pergunta,
      opcoes: quizForm.opcoes,
      resposta_correta: quizForm.resposta_correta,
      topico_id: quizForm.topico_id,
      disciplina_id: id,
    };
    if (editingQuiz) {
      await supabase.from('quizzes').update(updateData).eq('id', editingQuiz.id);
    } else {
      await supabase.from('quizzes').insert(updateData);
    }
    await fetchAll();
    setQuizDialog(false);
    setEditingQuiz(null);
    setQuizForm({ pergunta: '', opcoes: ['', '', '', ''], resposta_correta: 0, topico_id: '' });
  };

  const handleSaveDiscussao = async () => {
    await supabase.from('discussoes').insert({ comentario: discussaoForm.comentario, topico_id: discussaoForm.topico_id, user_id: user?.id, disciplina_id: id });
    await fetchAll();
    setDiscussaoDialog(false);
    setDiscussaoForm({ comentario: '', topico_id: '' });
  };

  const handleAssociarProcesso = async () => {
    if (!selectedProcesso) return;
    await supabase.from('disciplina_processos').insert({ disciplina_id: id, processo_id: selectedProcesso });
    await fetchAll();
    setProcessDialog(false);
    setSelectedProcesso('');
  };

  const handleQuizAnswer = (quizId: string, answerIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [quizId]: answerIdx }));
  };

  const handleQuizSubmit = (quiz: Quiz) => {
    const isCorrect = quizAnswers[quiz.id] === quiz.resposta_correta;
    setQuizResults(prev => ({ ...prev, [quiz.id]: isCorrect }));
  };

  const filteredTopicos = topicos.filter(t => t.nome.toLowerCase().includes(searchQuery.toLowerCase()));
  const completedCount = progressos.filter(p => p.completado).length;
  const progressPercent = topicos.length > 0 ? Math.round((completedCount / topicos.length) * 100) : 0;

  if (loading) return <AppLayout><div className="p-6"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div></AppLayout>;
  if (!disciplina) return (
    <AppLayout>
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Disciplina não encontrada.</p>
        <Button asChild className="mt-4" variant="outline"><Link to="/conhecimento">Voltar</Link></Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/conhecimento')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
              {disciplina.descricao && <p className="text-sm text-muted-foreground mt-0.5">{disciplina.descricao}</p>}
            </div>
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            Progresso: {completedCount}/{topicos.length} ({progressPercent}%)
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>

        <Input
          placeholder="Buscar tópicos, quizzes, discussões..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />

        <Tabs defaultValue="topicos">
          <TabsList className="h-auto border-b border-border rounded-none bg-transparent p-0 w-full justify-start overflow-x-auto">
            {[
              { value: 'topicos', label: 'Tópicos' },
              { value: 'quizzes', label: 'Quizzes' },
              { value: 'discussoes', label: 'Discussões' },
              { value: 'processos', label: 'Processos' },
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
            {filteredTopicos.map(t => {
              const isCompleted = progressos.find(p => p.topico_id === t.id)?.completado;
              return (
                <Card key={t.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={!!isCompleted}
                          onCheckedChange={(checked) => handleToggleCompletado(t.id, !!checked)}
                        />
                        <div className="flex-1">
                          <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{t.nome}</h3>
                          {t.conteudo && <p className="text-sm text-muted-foreground mt-1">{t.conteudo}</p>}
                          {t.referencias && <p className="text-xs text-muted-foreground mt-1 italic">{t.referencias}</p>}
                          {t.video_url && (
                            <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 block">
                              Ver vídeo
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingTopico(t);
                          setTopicoForm({ nome: t.nome, conteudo: t.conteudo || '', referencias: t.referencias || '', video_url: t.video_url || '' });
                          setTopicoDialog(true);
                        }}>Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTopico(t.id)}>Remover</Button>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                        setDiscussaoForm({ comentario: '', topico_id: t.id });
                        setDiscussaoDialog(true);
                      }}>
                        <MessageSquare className="h-3 w-3 mr-1" /> Comentar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => {
                        setQuizForm({ pergunta: '', opcoes: ['', '', '', ''], resposta_correta: 0, topico_id: t.id });
                        setQuizDialog(true);
                      }}>
                        <BookOpen className="h-3 w-3 mr-1" /> Adicionar Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <Button onClick={() => { setEditingTopico(null); setTopicoForm({ nome: '', conteudo: '', referencias: '', video_url: '' }); setTopicoDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Tópico
            </Button>
          </TabsContent>

          {/* QUIZZES */}
          <TabsContent value="quizzes" className="mt-6 space-y-4">
            {quizzes.filter(q => q.pergunta.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
              <Card key={q.id}>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium">{q.pergunta}</h3>
                  <div className="space-y-2">
                    {q.opcoes.map((op, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={quizAnswers[q.id] === idx}
                          onChange={() => handleQuizAnswer(q.id, idx)}
                          className="accent-foreground"
                        />
                        <span className={`text-sm ${quizResults[q.id] !== undefined ? (idx === q.resposta_correta ? 'text-green-600 dark:text-green-400 font-medium' : quizAnswers[q.id] === idx ? 'text-red-500 line-through' : '') : ''}`}>
                          {op}
                        </span>
                      </label>
                    ))}
                  </div>
                  {quizResults[q.id] !== undefined && (
                    <p className={`text-sm font-medium ${quizResults[q.id] ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {quizResults[q.id] ? '✓ Correto!' : '✗ Incorreto'}
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleQuizSubmit(q)}>Verificar</Button>
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => { setEditingQuiz(null); setQuizForm({ pergunta: '', opcoes: ['', '', '', ''], resposta_correta: 0, topico_id: '' }); setQuizDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Quiz
            </Button>
          </TabsContent>

          {/* DISCUSSÕES */}
          <TabsContent value="discussoes" className="mt-6 space-y-4">
            {discussoes.filter(d => d.comentario.toLowerCase().includes(searchQuery.toLowerCase())).map(d => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <p className="text-sm">{d.comentario}</p>
                  {(() => {
                    const t = topicos.find(t => t.id === d.topico_id);
                    return t ? <Badge variant="outline" className="mt-2 text-xs">{t.nome}</Badge> : null;
                  })()}
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => { setDiscussaoForm({ comentario: '', topico_id: '' }); setDiscussaoDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo Comentário
            </Button>
          </TabsContent>

          {/* PROCESSOS */}
          <TabsContent value="processos" className="mt-6 space-y-4">
            {processosAssociados.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum processo associado.</p>
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
              <Plus className="h-4 w-4 mr-1" /> Associar Processo
            </Button>
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
            <div><Label>URL do Vídeo</Label><Input value={topicoForm.video_url} onChange={e => setTopicoForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTopico} disabled={!topicoForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Quiz */}
      <Dialog open={quizDialog} onOpenChange={setQuizDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuiz ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Pergunta *</Label><Input value={quizForm.pergunta} onChange={e => setQuizForm(f => ({ ...f, pergunta: e.target.value }))} /></div>
            {quizForm.opcoes.map((op, idx) => (
              <div key={idx}>
                <Label>Opção {idx + 1}</Label>
                <Input value={op} onChange={e => {
                  const newOpcoes = [...quizForm.opcoes];
                  newOpcoes[idx] = e.target.value;
                  setQuizForm(f => ({ ...f, opcoes: newOpcoes }));
                }} />
              </div>
            ))}
            <div>
              <Label>Resposta Correta</Label>
              <Select value={quizForm.resposta_correta.toString()} onValueChange={v => setQuizForm(f => ({ ...f, resposta_correta: parseInt(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 1, 2, 3].map(i => <SelectItem key={i} value={i.toString()}>Opção {i + 1}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {topicos.length > 0 && (
              <div>
                <Label>Tópico</Label>
                <Select value={quizForm.topico_id} onValueChange={v => setQuizForm(f => ({ ...f, topico_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar tópico" /></SelectTrigger>
                  <SelectContent>{topicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuiz} disabled={!quizForm.pergunta.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Discussão */}
      <Dialog open={discussaoDialog} onOpenChange={setDiscussaoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Comentário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {topicos.length > 0 && (
              <div>
                <Label>Tópico</Label>
                <Select value={discussaoForm.topico_id} onValueChange={v => setDiscussaoForm(f => ({ ...f, topico_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar tópico" /></SelectTrigger>
                  <SelectContent>{topicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Comentário *</Label><Textarea value={discussaoForm.comentario} onChange={e => setDiscussaoForm(f => ({ ...f, comentario: e.target.value }))} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscussaoDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveDiscussao} disabled={!discussaoForm.comentario.trim()}>Postar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Associar Processo */}
      <Dialog open={processDialog} onOpenChange={setProcessDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Associar Processo Académico</DialogTitle></DialogHeader>
          <div>
            <Label>Processo</Label>
            <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
              <SelectTrigger><SelectValue placeholder="Selecionar processo" /></SelectTrigger>
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
