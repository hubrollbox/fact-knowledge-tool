import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, MapPin } from 'lucide-react';
import { useActualizarEstado } from '../hooks/useObras';
import { ESTADOS_OCORRENCIA, GRAVIDADES, gravidadeVariant, type Ocorrencia } from '../types/obras';

export function OcorrenciaItem({ o, canWrite }: { o: Ocorrencia; canWrite: boolean }) {
  const upd = useActualizarEstado();

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="font-medium text-sm">{o.titulo}</div>
        {o.localizacao && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{o.localizacao}</div>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant={gravidadeVariant(o.gravidade)}>{GRAVIDADES[o.gravidade as keyof typeof GRAVIDADES] ?? o.gravidade}</Badge>
          {!canWrite && <Badge variant="outline">{ESTADOS_OCORRENCIA[o.estado as keyof typeof ESTADOS_OCORRENCIA] ?? o.estado}</Badge>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        {canWrite && (
          <Select value={o.estado} onValueChange={(estado) => upd.mutate({ table: 'obras_ocorrencias', id: o.id, estado })}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ESTADOS_OCORRENCIA).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to={`/obras/${o.obra_id}/ocorrencia/${o.id}`}><ExternalLink className="mr-1 h-3.5 w-3.5" />Abrir dossier</Link>
        </Button>
      </div>
    </div>
  );
}
