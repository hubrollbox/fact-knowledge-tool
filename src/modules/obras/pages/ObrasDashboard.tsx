import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardHat, Loader2, Plus, MapPin, ListChecks, ClipboardList } from 'lucide-react';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useObras, useOcorrenciasAbertas } from '../hooks/useObras';
import { ESTADOS_OBRA, GRAVIDADES, gravidadeVariant } from '../types/obras';

export function ObrasDashboard() {
  const { data: obras, isLoading, isError } = useObras();
  const { data: abertas } = useOcorrenciasAbertas();
  const { canWrite } = useWorkspaceRole();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Obras</h1>
          <p className="text-sm text-muted-foreground">Visitas, ocorrências, fotos e ações no terreno</p>
        </div>
        {canWrite && <Button asChild size="sm"><Link to="/obras/nova"><Plus className="h-4 w-4 mr-1" />Nova obra</Link></Button>}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ocorrências por resolver</h2>
        {!abertas?.length ? <p className="text-sm text-muted-foreground">Nenhuma ocorrência por resolver.</p> : (
          <div className="space-y-2">
            {abertas.map((oc) => (
              <Link key={oc.id} to={`/obras/${oc.obra_id}/ocorrencia/${oc.id}`} className="flex items-center justify-between gap-2 border border-border rounded-md p-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{oc.titulo}</div>
                  <div className="text-xs text-muted-foreground">{(oc.obras as { nome: string } | null)?.nome}</div>
                </div>
                <Badge variant={gravidadeVariant(oc.gravidade)}>{GRAVIDADES[oc.gravidade as keyof typeof GRAVIDADES]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Obras</h2>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as obras. Tente recarregar a página.</p>
        ) : !obras?.length ? (
          <Card><CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Ainda não existem obras. Crie a primeira obra para começar a registar visitas, ocorrências e fotos.</p>
            {canWrite && <Button asChild size="sm"><Link to="/obras/nova">Criar primeira obra</Link></Button>}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {obras.map((o) => (
              <Link key={o.id} to={`/obras/${o.id}`}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2"><HardHat className="h-4 w-4 text-muted-foreground" />{o.nome}</CardTitle>
                      <Badge variant="outline">{ESTADOS_OBRA[o.estado as keyof typeof ESTADOS_OBRA]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {o.codigo && <div>{o.codigo}</div>}
                    {o.morada && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{o.morada}</div>}
                    {o.dono_obra && <div>Dono de obra: {o.dono_obra}</div>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>



      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div><h2 className="text-sm font-semibold">Acompanhamento operacional</h2><p className="text-xs text-muted-foreground">Consulte responsáveis, prazos e acções pendentes.</p></div>
        <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link to="/obras/formularios"><ClipboardList className="mr-2 h-4 w-4" />Modelos de formulários</Link></Button><Button asChild size="sm" variant="outline"><Link to="/obras/acoes"><ListChecks className="mr-2 h-4 w-4" />Fila de acções</Link></Button></div>
      </div>


    </div>
  );
}
