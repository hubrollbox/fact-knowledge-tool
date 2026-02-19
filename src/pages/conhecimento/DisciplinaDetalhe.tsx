import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen, Search, Image as ImageIcon, Youtube, CheckCircle, BarChart2, Calendar, MessageSquare, Download } from 'lucide-react';
import Timeline from 'react-calendar-timeline';
import 'react-calendar-timeline/lib/Timeline.css';
import moment from 'moment';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Disciplina, Topico, Processo } from '@/types';

// Registro Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Tipos expandidos
interface TopicoExtended extends Topico {
  completado?: boolean;
  imagem_url?: string;
  video_url?: string;
}

interface Quiz {
  id: string;
  topico_id: string;
  pergunta: string;
  opcoes: string[]; // JSON array
  resposta_correta: number; // Índice da correta
}

interface Discussao {
  id: string;
  topico_id: string;
  comentario: string;
  user_id: string;
}

interface Evento {
  id: string;
  titulo: string;
  start_time: string;
  end_time: string;
  group: number;
}

interface Progresso {
  topico_id: string;
  completado: boolean;
}

export default function DisciplinaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [topicos, setTopicos] = useState<TopicoExtended[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [discussoes, setDiscussoes] = useState<Discussao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [progressos, setProgressos] = useState<Progresso[]>([]);
  const [processosAssociados, setProcessosAssociados] = useState<Processo[]>([]);
  const [todosProcessos, setTodosProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [topicoDialog, setTopicoDialog] = useState(false);
  const [editingTopico, setEditingTopico] = useState<TopicoExtended | null>(null);
  const [topicoForm, setTopicoForm] = useState({ nome: '', conteudo: '', referencias: '', imagem: null as File | null, video_url: '' });
  const [quizDialog, setQuizDialog] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({ pergunta: '', opcoes: ['', '', '', ''], resposta_correta: 0, topico_id: '' });
  const [discussaoDialog, setDiscussaoDialog] = useState(false);
  const [discussaoForm, setDiscussaoForm] = useState({ comentario: '', topico_id: '' });
  const [eventoDialog, setEventoDialog] = useState(false);
  const [eventoForm, setEventoForm] = useState({ titulo: '', start_time: '', end_time: '' });
  const [processDialog, setProcessDialog] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!id || !user) return;
    const [dRes, tRes, qRes, discRes, eRes, progRes, dpRes, pRes] = await Promise.all([
      supabase.from('disciplinas').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('topicos').select('*').eq('disciplina_id', id).order('nome'),
      supabase.from('quizzes').select('*').eq('disciplina_id', id), // Ajuste se necessário
      supabase.from('discussoes').select('*').eq('disciplina_id', id),
      supabase.from('eventos').select('*').eq('disciplina_id', id),
      supabase.from('progressos').select('*').eq('user_id', user.id).eq('disciplina_id', id),
      supabase.from('disciplina_processos').select('*, processo:processos(id,titulo,tipo,estado,materia)').eq('disciplina_id', id),
      supabase.from('processos').select('id,titulo,tipo').eq('user_id', user.id).eq('tipo', 'academico').order('titulo'),
    ]);
    setDisciplina(dRes.data as Disciplina);
    setTopicos((tRes.data as TopicoExtended[]) || []);
    setQuizzes((qRes.data as Quiz[]) || []);
    setDiscussoes((discRes.data as Discussao[]) || []);
    setEventos((eRes.data as Evento[]) || []);
    setProgressos((progRes.data as Progresso[]) || []);
    setProcessosAssociados((dpRes.data || []).map((dp: { processo: Processo }) => dp.processo));
    setTodosProcessos((pRes.data as Processo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id, user]);

  // Funções para salvar (adaptadas para novas features)
  const handleSaveTopico = async () => {
    // ... (mesmo do anterior, com adição de video_url)
    let imagemUrl = null;
    if (topicoForm.imagem) {
      const { data } = await supabase.storage.from('topicos-imagens').upload(`\( {id}/ \){topicoForm.imagem.name}`, topicoForm.imagem);
      imagemUrl = data?.path || null;
    }
    const updateData = {
      nome: topicoForm.nome.trim(),
      conteudo: topicoForm.conteudo.trim() || null,
      referencias: topicoForm.referencias.trim() || null,
      imagem_url: imagemUrl || editingTopico?.imagem_url,
      video_url: topicoForm.video_url.trim() || null,
    };
    if (editingTopico) {
      await supabase.from('topicos').update(updateData).eq('id', editingTopico.id);
    } else {
      await supabase.from('topicos').insert({ ...updateData, disciplina_id: id });
    }
    await fetchAll();
    setTopicoDialog(false);
  };

  const handleToggleCompletado = async (tid: string, completado: boolean) => {
    await supabase.from('progressos').upsert({ topico_id: tid, user_id: user?.id, completado }, { onConflict: 'topico_id,user_id' });
    await fetchAll();
  };

  const handleSaveQuiz = async () => {
    const updateData = {
      pergunta: quizForm.pergunta,
      opcoes: quizForm.opcoes,
      resposta_correta: quizForm.resposta_correta,
      topico_id: quizForm.topico_id,
    };
    if (editingQuiz) {
      await supabase.from('quizzes').update(updateData).eq('id', editingQuiz.id);
    } else {
      await supabase.from('quizzes').insert(updateData);
    }
    await fetchAll();
    setQuizDialog(false);
  };

  const handleSaveDiscussao = async () => {
    await supabase.from('discussoes').insert({ comentario: discussaoForm.comentario, topico_id: discussaoForm.topico_id, user_id: user?.id });
    await fetchAll();
    setDiscussaoDialog(false);
  };

  const handleSaveEvento = async () => {
    await supabase.from('eventos').insert({ titulo: eventoForm.titulo, start_time: eventoForm.start_time, end_time: eventoForm.end_time, disciplina_id: id });
    await fetchAll();
    setEventoDialog(false);
  };

  const handleExportPDF = async () => {
    const content = pdfRef.current;
    if (content) {
      const canvas = await html2canvas(content);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // A4 size
      pdf.save(`${disciplina?.nome}.pdf`);
    }
  };

  // Filtros
  const filteredTopicos = topicos.filter(t => t.nome.toLowerCase().includes(searchQuery.toLowerCase()));
  const isTopicoUnlocked = (index: number) => index === 0 || progressos.find(p => p.topico_id === topicos[index - 1]?.id)?.completado;

  // Dados para gráfico de progresso
  const progressData = {
    labels: topicos.map(t => t.nome),
    datasets: [{
      label: 'Progresso',
      data: topicos.map(t => progressos.find(p => p.topico_id === t.id)?.completado ? 100 : 0),
      backgroundColor: 'rgba(75,192,192,0.6)',
    }],
  };

  // Grupos para timeline (exemplo simples)
  const groups = [{ id: 1, title: 'Disciplina' }];

  if (loading) return <AppLayout><div className="p-6"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div></AppLayout>;
  if (!disciplina) return <AppLayout><div className="p-6 text-center"><p className="text-muted-foreground">Disciplina não encontrada.</p><Button asChild className="mt-4" variant="outline"><Link to="/conhecimento">Voltar</Link></Button></div></AppLayout>;

  return (
    <AppLayout>
      <div ref={pdfRef} className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/conhecimento')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{disciplina.nome}</h1>
              {disciplina.descricao && <p className="text-sm text-muted-foreground mt-0.5">{disciplina.descricao}</p>}
            </div>
          </div>
          <Button onClick={handleExportPDF}><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
        </div>

        <Input 
          placeholder="Buscar em toda a disciplina..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="w-full max-w-md"
        />

        <Tabs defaultValue="topicos">
          <TabsList className="h-auto border-b border-border rounded-none bg-transparent p-0 w-full justify-start overflow-x-auto">
            {['topicos', 'quizzes', 'discussoes', 'cronograma', 'estatisticas', 'processos'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-foreground px-4 py-2 text-sm min-w-max">
                {tab === 'topicos' ? 'Tópicos' : tab === 'quizzes' ? 'Quizzes' : tab === 'discussoes' ? 'Discussões' : tab === 'cronograma' ? 'Cronograma' : tab === 'estatisticas' ? 'Estatísticas' : 'Processos'}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="topicos" className="mt-6 space-y-4">
            {/* Lista de tópicos com multimídia, caminhos personalizados e busca */}
            {filteredTopicos.map((t, index) => (
              <Card key={t.id} className={`border-border group ${!isTopicoUnlocked(index) ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{t.nome}</h3>
                    <Checkbox checked={progressos.find(p => p.topico_id === t.id)?.completado} onCheckedChange={(checked) => handleToggleCompletado(t.id, !!checked)} />
                  </div>
                  {t.conteudo && <p className="text-sm text-muted-foreground mt-1">{t.conteudo}</p>}
                  {t.imagem_url && <img src={supabase.storage.from('topicos-imagens').getPublicUrl(t.imagem_url).data.publicUrl} alt="Imagem" className="mt-2 max-w-xs" />}
                  {t.video_url && <iframe src={`https://www.youtube.com/embed/${t.video_url.split('v=')[1]}`} className="mt-2 w-full h-48" />}
                  <div className="flex gap-1 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => { setDiscussaoForm({ ...discussaoForm, topico_id: t.id }); setDiscussaoDialog(true); }}><MessageSquare className="h-4 w-4" /> Comentar</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setQuizForm({ ...quizForm, topico_id: t.id }); setQuizDialog(true); }}><BookOpen className="h-4 w-4" /> Adicionar Quiz</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => setTopicoDialog(true)}><Plus className="h-4 w-4 mr-1" /> Novo Tópico</Button>
          </TabsContent>

          <TabsContent value="quizzes">
            {/* Quizzes por tópico */}
            {quizzes.filter(q => q.pergunta.toLowerCase().includes(searchQuery.toLowerCase())).map(q => (
              <Card key={q.id}>
                <CardContent>
                  <h3>{q.pergunta}</h3>
                  {q.opcoes.map((op, idx) => (
                    <div key={idx}><input type="radio" name={q.id} /> {op}</div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Button onClick={() => setQuizDialog(true)}><Plus className="h-4 w-4 mr-1" /> Novo Quiz</Button>
          </TabsContent>

          <TabsContent value="discussoes">
            {/* Discussões por tópico */}
            {discussoes.filter(d => d.comentario.toLowerCase().includes(searchQuery.toLowerCase())).map(d => (
              <Card key={d.id}>
                <CardContent>{d.comentario}</CardContent>
              </Card>
            ))}
            <Button onClick={() => setDiscussaoDialog(true)}><Plus className="h-4 w-4 mr-1" /> Novo Comentário</Button>
          </TabsContent>

          <TabsContent value="cronograma">
            {/* Timeline */}
            <Timeline
              groups={groups}
              items={eventos.map(e => ({ id: e.id, group: 1, title: e.titulo, start_time: moment(e.start_time), end_time: moment(e.end_time) }))}
              defaultTimeStart={moment().add(-12, 'hour')}
              defaultTimeEnd={moment().add(12, 'hour')}
            />
            <Button onClick={() => setEventoDialog(true)}><Plus className="h-4 w-4 mr-1" /> Novo Evento</Button>
          </TabsContent>

          <TabsContent value="estatisticas">
            {/* Gráfico de progresso */}
            <Bar data={progressData} options={{ responsive: true }} />
          </TabsContent>

          <TabsContent value="processos">
            {/* ... (mesmo do original) */}
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogos (expandidos) */}
      <Dialog open={topicoDialog} onOpenChange={setTopicoDialog}>
        <DialogContent>
          {/* ... (mesmo, com adição de video_url input) */}
          <div className="space-y-2"><Label>URL do Vídeo (YouTube)</Label><Input value={topicoForm.video_url} onChange={e => setTopicoForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={quizDialog} onOpenChange={setQuizDialog}>
        <DialogContent>
          <DialogTitle>{editingQuiz ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
          <Input placeholder="Pergunta" value={quizForm.pergunta} onChange={e => setQuizForm(f => ({ ...f, pergunta: e.target.value }))} />
          {quizForm.opcoes.map((op, idx) => (
            <Input key={idx} placeholder={`Opção ${idx + 1}`} value={op} onChange={e => {
              const newOpcoes = [...quizForm.opcoes];
              newOpcoes[idx] = e.target.value;
              setQuizForm(f => ({ ...f, opcoes: newOpcoes }));
            }} />
          ))}
          <Select onValueChange={v => setQuizForm(f => ({ ...f, resposta_correta: parseInt(v) }))}>
            <SelectTrigger><SelectValue placeholder="Resposta Correta" /></SelectTrigger>
            <SelectContent>{[0,1,2,3].map(i => <SelectItem key={i} value={i.toString()}>{`Opção ${i+1}`}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleSaveQuiz}>Salvar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={discussaoDialog} onOpenChange={setDiscussaoDialog}>
        <DialogContent>
          <DialogTitle>Novo Comentário</DialogTitle>
          <Textarea value={discussaoForm.comentario} onChange={e => setDiscussaoForm(f => ({ ...f, comentario: e.target.value }))} />
          <Button onClick={handleSaveDiscussao}>Postar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={eventoDialog} onOpenChange={setEventoDialog}>
        <DialogContent>
          <DialogTitle>Novo Evento</DialogTitle>
          <Input placeholder="Título" value={eventoForm.titulo} onChange={e => setEventoForm(f => ({ ...f, titulo: e.target.value }))} />
          <Input type="datetime-local" value={eventoForm.start_time} onChange={e => setEventoForm(f => ({ ...f, start_time: e.target.value }))} />
          <Input type="datetime-local" value={eventoForm.end_time} onChange={e => setEventoForm(f => ({ ...f, end_time: e.target.value }))} />
          <Button onClick={handleSaveEvento}>Salvar</Button>
        </DialogContent>
      </Dialog>

      {/* ... (outros diálogos) */}
    </AppLayout>
  );
}