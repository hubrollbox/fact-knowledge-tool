import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Settings, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import { useProcesso } from '@/hooks/useProcessos';
import { FactosTab } from '@/components/processos/FactosTab';
import { IssuesTab } from '@/components/processos/IssuesTab';
import { RulesTab } from '@/components/processos/RulesTab';
import { ApplicationsTab } from '@/components/processos/ApplicationsTab';
import { ConclusoesTab } from '@/components/processos/ConclusoesTab';
import { DocumentosTab } from '@/components/processos/DocumentosTab';

export default function ProcessoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { processo, loading, error, refetch } = useProcesso(id);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  const handleEstadoChange = async (novoEstado: string) => {
    if (!id || !user) return;
    setUpdatingEstado(true);
    await supabase.from('processos').update({ estado: novoEstado }).eq('id', id).eq('user_id', user.id);
    await refetch();
    setUpdatingEstado(false);
  };

  const handleDelete = async () => {
    if (!id || !user || !confirm('Tem a certeza que quer eliminar este processo? Esta acção é irreversível.')) return;
    await supabase.from('processos').delete().eq('id', id).eq('user_id', user.id);
    navigate('/processos');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (error || !processo) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Processo não encontrado.</p>
          <Button asChild className="mt-4" variant="outline"><Link to="/processos">Voltar</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/processos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{processo.titulo}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-muted-foreground">
                  <span className="capitalize">{processo.tipo}</span>
                  {processo.materia && <span>· {processo.materia}</span>}
                  {processo.cliente && <span>· {(processo.cliente as { nome: string }).nome}</span>}
                  <span>· {formatarData(processo.created_at)}</span>
                </div>
                {processo.descricao && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{processo.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={processo.estado} onValueChange={handleEstadoChange} disabled={updatingEstado}>
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

        {/* Tabs */}
        <Tabs defaultValue="factos">
          <TabsList className="h-auto flex-wrap gap-0 border-b border-border rounded-none bg-transparent p-0 w-full justify-start">
            {['factos', 'issues', 'rules', 'applications', 'conclusoes', 'documentos'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm"
              >
                {tab === 'conclusoes' ? 'Conclusões' : tab === 'documentos' ? 'Documentos' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="factos" className="mt-6">
            <FactosTab processoId={processo.id} />
          </TabsContent>
          <TabsContent value="issues" className="mt-6">
            <IssuesTab processoId={processo.id} />
          </TabsContent>
          <TabsContent value="rules" className="mt-6">
            <RulesTab processoId={processo.id} />
          </TabsContent>
          <TabsContent value="applications" className="mt-6">
            <ApplicationsTab processoId={processo.id} />
          </TabsContent>
          <TabsContent value="conclusoes" className="mt-6">
            <ConclusoesTab processoId={processo.id} />
          </TabsContent>
          <TabsContent value="documentos" className="mt-6">
            <DocumentosTab processoId={processo.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
