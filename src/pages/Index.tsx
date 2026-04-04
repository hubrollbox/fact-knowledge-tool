import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, AlertCircle, Plus, ArrowRight, Mail, TimerReset, CalendarClock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { EmailWidget } from '@/components/dashboard/EmailWidget';
import { CountdownWidgetsBoard } from '@/components/dashboard/CountdownWidgetsBoard';
import { PlannerOverview } from '@/components/dashboard/PlannerOverview';
import type { Dossier } from '@/types';

interface Stats {
  countdownAbertos: number;
  emailsNaoLidos: number;
  issuesAbertas: number;
  proximoCompromisso: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    countdownAbertos: 0,
    emailsNaoLidos: 0,
    issuesAbertas: 0,
    proximoCompromisso: 'Sem agenda',
  });
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      const [pRes, iRes, countdownRes, emailServiceRes, docAgendaRes, factoAgendaRes] = await Promise.all([
        supabase.from('dossiers').select('id, titulo, estado, materia, updated_at, created_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('issues').select('id, estado, processo_id, dossiers!inner(user_id)').eq('dossiers.user_id', user.id).eq('estado', 'aberta'),
        supabase.from('countdown_events').select('id').eq('user_id', user.id).gte('target_date', nowIso),
        supabase.from('user_services').select('connected, metadata').eq('user_id', user.id).eq('service', 'gmail').maybeSingle(),
        supabase
          .from('documentos')
          .select('data_documento, dossiers!inner(user_id)')
          .eq('dossiers.user_id', user.id)
          .not('data_documento', 'is', null)
          .gte('data_documento', today)
          .order('data_documento', { ascending: true })
          .limit(1),
        supabase
          .from('factos')
          .select('data_facto, dossiers!inner(user_id)')
          .eq('dossiers.user_id', user.id)
          .not('data_facto', 'is', null)
          .gte('data_facto', today)
          .order('data_facto', { ascending: true })
          .limit(1),
      ]);

      setDossiers((pRes.data as Dossier[]) || []);
      const docDate = docAgendaRes.data?.[0]?.data_documento;
      const factoDate = factoAgendaRes.data?.[0]?.data_facto;
      const nextDate = [docDate, factoDate].filter(Boolean).sort((a, b) => (a as string).localeCompare(b as string))[0] as string | undefined;
      const rawUnread = (emailServiceRes.data?.metadata as { unread_count?: number; unreadCount?: number } | null) || null;
      const unreadCount = emailServiceRes.data?.connected ? Number(rawUnread?.unread_count ?? rawUnread?.unreadCount ?? 0) : 0;

      setStats({
        countdownAbertos: (countdownRes.data || []).length,
        emailsNaoLidos: Number.isFinite(unreadCount) ? unreadCount : 0,
        issuesAbertas: (iRes.data || []).length,
        proximoCompromisso: nextDate ? new Date(`${nextDate}T00:00:00`).toLocaleDateString('pt-PT') : 'Sem agenda',
      });

      setLoading(false);
    };
    load();
  }, [user]);

  const estadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      em_analise: 'bg-muted text-muted-foreground',
      em_progresso: 'bg-foreground text-background',
      concluido: 'bg-muted text-foreground',
      arquivado: 'bg-muted/50 text-muted-foreground',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[estado] || 'bg-muted'}`}>
        {ESTADO_LABELS[estado] || estado}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">FKT</p>
          </div>
          <Button asChild>
            <Link to="/dossiers/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Dossier
            </Link>
          </Button>
        </div>

        {/* Planner — destaque principal */}
        <PlannerOverview />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Countdown', value: stats.countdownAbertos, icon: TimerReset },
            { label: 'Emails', value: stats.emailsNaoLidos, icon: Mail },
            { label: 'Issues', value: stats.issuesAbertas, icon: AlertCircle },
            { label: 'Próximo', value: stats.proximoCompromisso, icon: CalendarClock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-lg font-bold text-foreground">{loading ? '—' : value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dossiers recentes */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Dossiers Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dossiers" className="text-xs text-muted-foreground hover:text-foreground">
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
                ))}
              </div>
            ) : dossiers.length === 0 ? (
              <div className="text-center py-10">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum dossier ainda</p>
                <Button asChild className="mt-4" variant="outline" size="sm">
                  <Link to="/dossiers/novo">Criar primeiro dossier</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {dossiers.map(p => (
                  <Link
                    key={p.id}
                    to={`/dossiers/${p.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:underline">{p.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.materia || 'Sem matéria'} · {formatarData(p.updated_at)}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0">{estadoBadge(p.estado)}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Widgets secundários */}
        <div className="grid md:grid-cols-2 gap-4">
          <AgendaWidget />
          <EmailWidget />
        </div>

        <CountdownWidgetsBoard />
      </div>
    </AppLayout>
  );
}
