import { useNavigate } from 'react-router-dom';
import { Calendar, LogIn, LogOut, Syringe, Stethoscope } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReservasHoje } from '../hooks/useReservas';
import { useAlertasVacinas } from '../hooks/useClinico';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceId } from '../hooks/useWorkspaceId';

function useConsultasHoje() {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ['canil_consultas_hoje', workspaceId],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('canil_registos_clinicos')
        .select('*, animal:canil_animais(id, nome)')
        .eq('workspace_id', workspaceId!)
        .eq('tipo', 'consulta')
        .eq('data_registo', hoje);
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function AgendaDiaria() {
  const navigate = useNavigate();
  const { data: reservas } = useReservasHoje();
  const { data: alertas } = useAlertasVacinas();
  const { data: consultas } = useConsultasHoje();
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  const urgentes = (alertas ?? []).filter((a: any) => {
    const diff =
      (parseISO(a.data_proxima).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda diária</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(hoje, "EEEE, d 'de' MMMM yyyy", { locale: pt })}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Hotel — entradas e saídas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!reservas?.length ? (
            <p className="text-sm text-muted-foreground">Sem movimentos</p>
          ) : (
            reservas.map((r: any) => {
              const isEntrada = r.data_entrada === hojeStr;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {isEntrada ? (
                      <LogIn className="h-4 w-4 text-green-600" />
                    ) : (
                      <LogOut className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="font-medium">{r.animal?.nome ?? '—'}</span>
                    {r.box && <Badge variant="outline">Box {r.box}</Badge>}
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4" />
            Consultas agendadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!consultas?.length ? (
            <p className="text-sm text-muted-foreground">Sem consultas</p>
          ) : (
            consultas.map((c: any) => (
              <div
                key={c.id}
                onClick={() => c.animal && navigate(`/canil/${c.animal.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{c.animal?.nome ?? '—'}</div>
                  {c.descricao && (
                    <div className="text-xs text-muted-foreground">{c.descricao}</div>
                  )}
                </div>
                {c.veterinario && (
                  <span className="text-xs text-muted-foreground">{c.veterinario}</span>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="h-4 w-4 text-destructive" />
            Vacinas urgentes (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!urgentes.length ? (
            <p className="text-sm text-muted-foreground">Sem alertas urgentes</p>
          ) : (
            urgentes.map((a: any) => (
              <div
                key={a.id}
                onClick={() => a.animal && navigate(`/canil/${a.animal.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-md border p-2.5 text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{a.animal?.nome ?? '—'}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {a.tipo}
                    {a.produto && ` · ${a.produto}`}
                  </div>
                </div>
                <Badge variant="destructive">
                  {format(parseISO(a.data_proxima), 'd MMM', { locale: pt })}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
