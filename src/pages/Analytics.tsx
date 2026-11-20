import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryState } from '@/components/common/QueryState';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ESTADO_LABELS } from '@/lib/utils-fkt';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['hsl(var(--foreground))', 'hsl(var(--muted-foreground))', 'hsl(var(--primary))', 'hsl(var(--accent))'];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoData, setEstadoData] = useState<{ name: string; value: number }[]>([]);
  const [monthData, setMonthData] = useState<{ mes: string; total: number }[]>([]);
  const [topDisciplinas, setTopDisciplinas] = useState<{ nome: string; count: number }[]>([]);
  const [actionData, setActionData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [dossiersRes, actionsRes, dpRes] = await Promise.all([
          supabase.from('dossiers').select('estado, created_at').eq('user_id', user.id),
          supabase.from('actions').select('estado, dossier_id, dossiers!inner(user_id)').eq('dossiers.user_id', user.id),
          supabase.from('disciplina_processos').select('disciplina_id, disciplinas!inner(nome, user_id)').eq('disciplinas.user_id', user.id),
        ]);

        const byEstado: Record<string, number> = {};
        (dossiersRes.data || []).forEach((d: any) => {
          byEstado[d.estado] = (byEstado[d.estado] || 0) + 1;
        });
        setEstadoData(Object.entries(byEstado).map(([k, v]) => ({ name: ESTADO_LABELS[k] || k, value: v })));

        const byMonth: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
        }
        (dossiersRes.data || []).forEach((d: any) => {
          const dt = new Date(d.created_at);
          const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
          if (k in byMonth) byMonth[k]++;
        });
        setMonthData(Object.entries(byMonth).map(([mes, total]) => ({ mes: mes.slice(5), total })));

        const byAction: Record<string, number> = { ativo: 0, a_aguardar: 0, concluido: 0 };
        (actionsRes.data || []).forEach((a: any) => {
          byAction[a.estado] = (byAction[a.estado] || 0) + 1;
        });
        setActionData([
          { name: 'Ativo', value: byAction.ativo },
          { name: 'A Aguardar', value: byAction.a_aguardar },
          { name: 'Concluído', value: byAction.concluido },
        ]);

        const byDisc: Record<string, { nome: string; count: number }> = {};
        (dpRes.data || []).forEach((r: any) => {
          const id = r.disciplina_id;
          if (!byDisc[id]) byDisc[id] = { nome: r.disciplinas?.nome ?? '—', count: 0 };
          byDisc[id].count++;
        });
        setTopDisciplinas(Object.values(byDisc).sort((a, b) => b.count - a.count).slice(0, 5));
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao carregar analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Métricas agregadas dos teus dossiers</p>
        </div>

        <QueryState loading={loading} error={error} skeletonRows={4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Dossiers por estado</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                {estadoData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={estadoData} dataKey="value" nameKey="name" outerRadius={80} label>
                        {estadoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Dossiers nos últimos 6 meses</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={monthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Acções (Planner) por estado</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={actionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top 5 disciplinas referenciadas</CardTitle></CardHeader>
              <CardContent>
                {topDisciplinas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem associações.</p>
                ) : (
                  <ul className="space-y-2">
                    {topDisciplinas.map((d) => (
                      <li key={d.nome} className="flex items-center justify-between text-sm">
                        <span className="truncate">{d.nome}</span>
                        <span className="text-muted-foreground font-mono">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </QueryState>
      </div>
    </AppLayout>
  );
}
