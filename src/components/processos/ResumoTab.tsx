import { useState, useEffect } from 'react';
import { FileText, Scale, BookOpen, ArrowRightLeft, CheckCircle2, Clock, User, AlignLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatarData } from '@/lib/utils-fkt';
import type { Dossier } from '@/types';

interface ResumoTabProps {
  processoId: string;
  processo: Dossier;
  onNavigateTab: (tab: string) => void;
}

interface Counts {
  factos: number;
  issues: number;
  rules: number;
  applications: number;
  conclusoes: number;
  documentos: number;
}

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
  created_at: string | null;
}

export function ResumoTab({ processoId, processo, onNavigateTab }: ResumoTabProps) {
  const [counts, setCounts] = useState<Counts>({ factos: 0, issues: 0, rules: 0, applications: 0, conclusoes: 0, documentos: 0 });
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [recentFactos, setRecentFactos] = useState<RecentFacto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [
        { count: factosCount },
        { count: issuesCount },
        { count: rulesCount },
        { count: appsCount },
        { data: issuesForConc },
        { count: docsCount },
        { data: docs },
        { data: factos },
      ] = await Promise.all([
        supabase.from('factos').select('*', { count: 'exact', head: true }).eq('dossier_id', processoId),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('dossier_id', processoId),
        supabase.from('rules').select('*', { count: 'exact', head: true }).eq('dossier_id', processoId),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('dossier_id', processoId),
        supabase.from('issues').select('id').eq('dossier_id', processoId),
        supabase.from('documentos').select('*', { count: 'exact', head: true }).eq('dossier_id', processoId),
        supabase.from('documentos').select('id, titulo, tipo, created_at').eq('dossier_id', processoId).order('created_at', { ascending: false }).limit(4),
        supabase.from('factos').select('id, descricao, data_facto, created_at').eq('dossier_id', processoId).order('data_facto', { ascending: false, nullsFirst: false }).limit(5),
      ]);

      let concCount = 0;
      if (issuesForConc && issuesForConc.length > 0) {
        const issueIds = issuesForConc.map(i => i.id);
        const { count } = await supabase.from('conclusoes').select('*', { count: 'exact', head: true }).in('issue_id', issueIds);
        concCount = count || 0;
      }

      setCounts({
        factos: factosCount || 0,
        issues: issuesCount || 0,
        rules: rulesCount || 0,
        applications: appsCount || 0,
        conclusoes: concCount,
        documentos: docsCount || 0,
      });
      setRecentDocs((docs as RecentDoc[]) || []);
      setRecentFactos((factos as RecentFacto[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [processoId]);

  const firacItems = [
    { key: 'factos', label: 'Factos', icon: AlignLeft, count: counts.factos, tab: 'factos' },
    { key: 'issues', label: 'Issues', icon: Scale, count: counts.issues, tab: 'issues' },
    { key: 'rules', label: 'Rules', icon: BookOpen, count: counts.rules, tab: 'rules' },
    { key: 'applications', label: 'Applications', icon: ArrowRightLeft, count: counts.applications, tab: 'applications' },
    { key: 'conclusoes', label: 'Conclusões', icon: CheckCircle2, count: counts.conclusoes, tab: 'conclusoes' },
  ];

  const cliente = processo.cliente as { nome: string; email?: string | null; telefone?: string | null } | undefined;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {processo.descricao && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-muted-foreground" />
              Descrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{processo.descricao}</p>
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            Análise FIRAC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {firacItems.map(item => (
              <button
                key={item.key}
                onClick={() => onNavigateTab(item.tab)}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">{item.count}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Documentos Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigateTab('documentos')}>
              Ver todos
            </Button>
          </div>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Cronologia
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigateTab('factos')}>
              Ver todos
            </Button>
          </div>
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
  );
}
