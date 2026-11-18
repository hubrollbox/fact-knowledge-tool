import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useActualizarEstado } from '../hooks/useObras';
import { ESTADOS_OCORRENCIA, GRAVIDADES, gravidadeVariant, type Ocorrencia } from '../types/obras';
import { FotosGaleria } from './FotosGaleria';

export function OcorrenciaItem({ o, canWrite }: { o: Ocorrencia; canWrite: boolean }) {
  const [aberto, setAberto] = useState(false);
  const upd = useActualizarEstado();
  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm">{o.titulo}</div>
          {o.localizacao && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{o.localizacao}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={gravidadeVariant(o.gravidade)}>{GRAVIDADES[o.gravidade as keyof typeof GRAVIDADES] ?? o.gravidade}</Badge>
          {canWrite ? (
            <Select value={o.estado} onValueChange={(estado) => upd.mutate({ table: 'obras_ocorrencias', id: o.id, estado })}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ESTADOS_OCORRENCIA).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          ) : <Badge variant="outline">{ESTADOS_OCORRENCIA[o.estado as keyof typeof ESTADOS_OCORRENCIA]}</Badge>}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAberto(!aberto)} aria-label="Ver detalhes">
            {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {aberto && (
        <div className="space-y-3 pt-1">
          {o.descricao && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.descricao}</p>}
          <FotosGaleria ocorrenciaId={o.id} canWrite={canWrite} />
        </div>
      )}
    </div>
  );
}
