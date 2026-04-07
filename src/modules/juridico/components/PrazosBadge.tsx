import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface PrazosBadgeProps {
  prazos: Array<{ data_limite: string; estado: string }>;
}

export function PrazosBadge({ prazos }: PrazosBadgeProps) {
  const hoje = new Date();
  const urgentes = prazos.filter((p) => {
    if (p.estado !== 'pendente') return false;
    const dias = differenceInDays(parseISO(p.data_limite), hoje);
    return dias <= 7;
  });

  if (urgentes.length === 0) return null;

  const maisUrgente = Math.min(
    ...urgentes.map((p) => differenceInDays(parseISO(p.data_limite), hoje))
  );

  const cor =
    maisUrgente < 3
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-yellow-500 text-white';

  return (
    <Badge className={`${cor} gap-1`}>
      <Clock className="h-3 w-3" />
      {urgentes.length} prazo{urgentes.length !== 1 ? 's' : ''} urgente{urgentes.length !== 1 ? 's' : ''}
    </Badge>
  );
}
