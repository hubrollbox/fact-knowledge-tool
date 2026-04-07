import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Scale } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Processo } from '../types/juridico';

const estadoCores: Record<string, string> = {
  activo: 'bg-green-600 text-white',
  suspenso: 'bg-yellow-500 text-white',
  concluido: 'bg-muted text-muted-foreground',
  arquivado: 'bg-secondary text-secondary-foreground',
};

interface ProcessoCardProps {
  processo: Processo;
  proximoPrazo?: { data_limite: string; descricao: string } | null;
  onClick?: () => void;
}

export function ProcessoCard({ processo, proximoPrazo, onClick }: ProcessoCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{processo.titulo}</CardTitle>
          <Badge className={estadoCores[processo.estado] ?? 'bg-muted text-muted-foreground'}>
            {processo.estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {processo.tipo && (
          <div className="flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            <span className="capitalize">{processo.tipo}</span>
          </div>
        )}
        {processo.tribunal && (
          <div className="text-xs">{processo.tribunal}</div>
        )}
        {proximoPrazo && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <Calendar className="h-3.5 w-3.5" />
            {format(parseISO(proximoPrazo.data_limite), "d MMM yyyy", { locale: pt })}
            {' — '}
            {proximoPrazo.descricao}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
