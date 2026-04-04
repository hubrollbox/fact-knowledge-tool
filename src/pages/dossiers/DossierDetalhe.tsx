import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, FileText, Clock, User, AlignLeft, Scale, BookOpen, ArrowRightLeft, CheckCircle2, ChevronDown, Plus, Check, Pencil, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import { useDossier } from '@/hooks/useDossiers';
import { useDossierActions } from '@/hooks/useActions';
import { FactosTab } from '@/components/processos/FactosTab';
import { IssuesTab } from '@/components/processos/IssuesTab';
import { RulesTab } from '@/components/processos/RulesTab';
import { ApplicationsTab } from '@/components/processos/ApplicationsTab';
import { ConclusoesTab } from '@/components/processos/ConclusoesTab';
import { DocumentosTab } from '@/components/processos/DocumentosTab';

interface RecentDoc {
  id: string;
  titulo: string;
  tipo: string | null;
  created_at: string | null;
}

interface RecentFacto {
  id: string;
  descricao: string;
  data_facto: string | null;
}

const ACTION_ESTADO_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  a_aguardar: 'A Aguardar',
  concluido: 'Concluído',
};

export default function DossierDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dossier, loading, error, refetch } = useDossier(id);
  const { actions, createAction, completeAction, updateAction } = useDossierActions(id || '');
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [recentFactos, setRecentFactos] = useState<RecentFacto[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDate, setNewActionDate] = useState('');
  const [showNewAction, setShowNewAction] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('documentos').select('id, titulo, tipo, created_at').eq('dossier_id', id).order('created_at', { ascending: false }).limit(4),
      supabase.from('factos').select('id, descricao, data_facto').eq('dossier_id', id).order('data_facto', { ascending: false, nullsFirst: false }).limit(5),
    ]).then(([docsRes, factosRes]) => {
      setRecentDocs((docsRes.data as RecentDoc[]) || []);
      setRecentFactos((factosRes.data as RecentFacto[]) || []);
    });
  }, [id]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEstadoChange = async (novoEstado: string) => {
    if (!id || !user) return;
    setUpdatingEstado(true);
    await supabase.from('dossiers').update({ estado: novoEstado }).eq('id', id).eq('user_id', user.id);
    await refetch();
    setUpdatingEstado(false);
  };

  const handleDelete = async () => {
    if (!id || !user || !confirm('Tem a certeza que quer eliminar este dossier? Esta acção é irreversível.')) return;
    await supabase.from('dossiers').delete().eq('id', id).eq('user_id', user.id);
    navigate('/dossiers');
  };

  const handleCreateAction = async () => {
    if (!newActionTitle.trim()) return;
    await createAction(newActionTitle, newActionDate || undefined);
    setNewActionTitle('');
    setNewActionDate('');
    setShowNewAction(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (error || !dossier) {
    return (
      <AppLayout>
        <div className="p-6 max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">Dossier não encontrado.</p>
          <Button asChild className="mt-4" variant="outline"><Link to="/dossiers">Voltar</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const cliente = dossier.cliente as { nome: string; email?: string | null; telefone?: string | null } | undefined;
  const activeActions = actions.filter(a => a.estado !== 'concluido');
  const completedActions = actions.filter(a => a.estado === 'concluido');

  const firacSections = [
    { key: 'factos', label: 'Factos', icon: AlignLeft, component: <FactosTab processoId={dossier.id} /> },
    { key: 'issues', label: 'Issues', icon: Scale, component: <IssuesTab processoId={dossier.id} /> },
    { key: 'rules', label: 'Rules', icon: BookOpen, component: <RulesTab processoId={dossier.id} /> },
    { key: 'applications', label: 'Applications', icon: ArrowRightLeft, component: <ApplicationsTab processoId={dossier.id} /> },
    { key: 'conclusoes', label: 'Conclusões', icon: CheckCircle2, component: <ConclusoesTab processoId={dossier.id} /> },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dossiers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{dossier.titulo}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                  <span className="capitalize">{dossier.tipo}</span>
                  {dossier.materia && <span>· {dossier.materia}</span>}
                  {cliente && <span>· {cliente.nome}</span>}
                  <span>· {formatarData(dossier.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={dossier.estado} onValueChange={handleEstadoChange} disabled={updatingEstado}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Ações
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowNewAction(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Nova
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {showNewAction && (
              <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
                <Input
                  value={newActionTitle}
                  onChange={e => setNewActionTitle(e.target.value)}
                  placeholder="Título da ação..."
                  className="flex-1 h-8 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleCreateAction()}
                />
                <Input
                  type="date"
                  value={newActionDate}
                  onChange={e => setNewActionDate(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
                <Button size="icon" className="h-8 w-8" onClick={handleCreateAction}><Check className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowNewAction(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            )}
            {activeActions.length === 0 && !showNewAction ? (
              <p className="text-sm text-muted-foreground py-2">Sem ações pendentes.</p>
            ) : (
              activeActions.map(action => (
                <div key={action.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border bg-card group">
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => completeAction(action.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm text-foreground flex-1">{action.titulo}</span>
                  <span className="text-xs text-muted-foreground">{ACTION_ESTADO_LABELS[action.estado]}</span>
                  {action.data && <span className="text-xs text-muted-foreground">{formatarData(action.data)}</span>}
                </div>
              ))
            )}
            {completedActions.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {completedActions.length} concluída{completedActions.length !== 1 ? 's' : ''} ▾
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1">
                  {completedActions.map(action => (
                    <div key={action.id} className="flex items-center gap-3 py-1.5 px-3 text-sm text-muted-foreground line-through">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      {action.titulo}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dossier.descricao && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlignLeft className="h-4 w-4 text-muted-foreground" />
                  Descrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dossier.descricao}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Documentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento associado.</p>
              ) : (
                <ul className="space-y-2">
                  {recentDocs.map(doc => (
                    <li key={doc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{doc.titulo}</span>
                      </div>
                      {doc.tipo && <span className="text-xs text-muted-foreground shrink-0 ml-2">{doc.tipo}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Cronologia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentFactos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum facto registado.</p>
              ) : (
                <ul className="space-y-3">
                  {recentFactos.map(facto => (
                    <li key={facto.id} className="flex gap-3 text-sm">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                        <div className="w-px flex-1 bg-border" />
                      </div>
                      <div className="min-w-0 pb-2">
                        <p className="text-foreground line-clamp-2">{facto.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatarData(facto.data_facto)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {cliente && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">{cliente.nome}</p>
                  {cliente.email && <p className="text-muted-foreground">{cliente.email}</p>}
                  {cliente.telefone && <p className="text-muted-foreground">{cliente.telefone}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documentos (full) */}
        <Collapsible open={openSections['documentos']} onOpenChange={() => toggleSection('documentos')}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Documentos</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections['documentos'] ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="border border-border rounded-lg p-4 bg-card">
              <DocumentosTab processoId={dossier.id} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* FIRAC Sections */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Análise FIRAC</h2>
          {firacSections.map(section => (
            <Collapsible key={section.key} open={openSections[section.key]} onOpenChange={() => toggleSection(section.key)}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{section.label}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[section.key] ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="border border-border rounded-lg p-4 bg-card">
                  {section.component}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
