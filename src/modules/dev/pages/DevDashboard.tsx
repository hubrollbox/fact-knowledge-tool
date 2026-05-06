import { Link } from 'react-router-dom';
import { useProjectos } from '../hooks/useProjectos';
import { useIssuesAbertasCount } from '../hooks/useIssues';
import { useAdrsRecentes } from '../hooks/useAdrs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2, AlertCircle, FileText, Loader2 } from 'lucide-react';

export function DevDashboard() {
  const { data: projectos, isLoading } = useProjectos();
  const { data: issuesCount } = useIssuesAbertasCount();
  const { data: adrs } = useAdrsRecentes(5);

  const activos = (projectos ?? []).filter((p) => p.estado === 'activo');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dev</h1>
        <p className="text-sm text-muted-foreground">Projectos, issues e decisões de arquitectura</p>
      </div>

      {/* Projectos activos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Projectos activos
        </h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : activos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum projecto activo.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activos.map((p) => {
              const open = issuesCount?.[p.id] ?? 0;
              return (
                <Link key={p.id} to={`/dev/${p.id}`}>
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          {p.nome}
                        </CardTitle>
                        {open > 0 && (
                          <Badge variant="secondary" className="shrink-0">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {open}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {p.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao}</p>
                      )}
                      {p.stack && p.stack.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.stack.slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                      {p.versao_actual && (
                        <p className="text-xs text-muted-foreground">v{p.versao_actual}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ADRs recentes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          ADRs recentes
        </h2>
        {!adrs || adrs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma decisão registada.</p>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {adrs.map((a) => (
                <Link key={a.id} to={`/dev/${a.projecto_id}`} className="block p-3 hover:bg-muted/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">ADR-{String(a.numero).padStart(3, '0')}</span>
                      <span className="font-medium truncate">{a.titulo}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">{a.estado}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
