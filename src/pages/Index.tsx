import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, AlertCircle, Plus, ArrowRight, Mail, TimerReset, CalendarClock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS, formatarData } from '@/lib/utils-fkt';
import { AgendaWidget } from '@/components/dashboard/AgendaWidget';
import { EmailWidget } from '@/components/dashboard/EmailWidget';
import { CountdownWidgetsBoard } from '@/components/dashboard/CountdownWidgetsBoard';
import type { Processo } from '@/types';

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
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      const [pRes, iRes, countdownRes, emailServiceRes, docAgendaRes, factoAgendaRes] = await Promise.all([
        supabase.from('processos').select('id, titulo, estado, materia, updated_at, created_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('issues').select('id, estado, processo_id, processos!inner(user_id)').eq('processos.user_id', user.id).eq('estado', 'aberta'),
        supabase.from('countdown_events').select('id').eq('user_id', user.id).gte('target_date', nowIso),
        supabase.from('user_services').select('connected, metadata').eq('user_id', user.id).eq('service', 'gmail').maybeSingle(),
        supabase
          .from('documentos')
          .select('data_documento, processos!inner(user_id)')
          .eq('processos.user_id', user.id)
          .not('data_documento', 'is', null)
          .gte('data_documento', today)
          .order('data_documento', { ascending: true })
          .limit(1),
        supabase
          .from('factos')
          .select('data_facto, processos!inner(user_id)')
          .eq('processos.user_id', user.id)
          .not('data_facto', 'is', null)
          .gte('data_facto', today)
          .order('data_facto', { ascending: true })
          .limit(1),
      ]);

      setProcessos((pRes.data as Processo[]) || []);
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
            <p className="text-sm text-muted-foreground mt-0.5">Workoffice</p>
          </div>
          <Button asChild>
            <Link to="/processos/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Processo
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { label: 'Countdown Abertos', value: stats.countdownAbertos, icon: TimerReset },
            { label: 'Emails Não Lidos', value: stats.emailsNaoLidos, icon: Mail },
            { label: 'Issues Abertas', value: stats.issuesAbertas, icon: AlertCircle },
            { label: 'Próximo Compromisso', value: stats.proximoCompromisso, icon: CalendarClock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {loading ? '—' : value}
                    </p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Processos recentes */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Processos Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/processos" className="text-xs text-muted-foreground hover:text-foreground">
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
            ) : processos.length === 0 ? (
              <div className="text-center py-10">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum processo ainda</p>
                <Button asChild className="mt-4" variant="outline" size="sm">
                  <Link to="/processos/novo">Criar primeiro processo</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {processos.map(p => (
                  <Link
                    key={p.id}
                    to={`/processos/${p.id}`}
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

        {/* Agenda & Email widgets */}
        <div className="grid md:grid-cols-2 gap-4">
          <AgendaWidget />
          <EmailWidget />
        </div>

        <CountdownWidgetsBoard />
      </div>
    </AppLayout>
  );
}
