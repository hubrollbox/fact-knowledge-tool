import { useNavigate } from 'react-router-dom';
import { Loader2, Dog, Syringe, Calendar, LogIn, LogOut } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAnimais } from '../hooks/useAnimais';
import { useReservasHoje } from '../hooks/useReservas';
import { useAlertasVacinas } from '../hooks/useClinico';
import { AnimalCard } from '../components/AnimalCard';

export function CanilDashboard() {
  const navigate = useNavigate();
  const { data: animais, isLoading: loadingA } = useAnimais();
  const { data: reservas } = useReservasHoje();
  const { data: alertas } = useAlertasVacinas();
  const hoje = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Canil</h1>
        <p className="text-sm text-muted-foreground">
          Gestão de animais, reservas e alertas clínicos
        </p>
      </div>

      {/* Reservas hoje + Alertas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Reservas hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!reservas?.length ? (
              <p className="text-sm text-muted-foreground">Sem movimentos hoje</p>
            ) : (
              reservas.map((r: any) => {
                const isEntrada = r.data_entrada === hoje;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
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
                    <span className="text-xs text-muted-foreground">
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
              <Syringe className="h-4 w-4" />
              Alertas de vacinas (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!alertas?.length ? (
              <p className="text-sm text-muted-foreground">Sem alertas</p>
            ) : (
              alertas.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => a.animal && navigate(`/canil/animal/${a.animal.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-md border p-2 text-sm hover:bg-accent"
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

      {/* Animais */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Animais</h2>
        {loadingA ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !animais?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Dog className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhum animal registado</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {animais.map((a) => (
              <AnimalCard
                key={a.id}
                animal={a}
                onClick={() => navigate(`/canil/animal/${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
