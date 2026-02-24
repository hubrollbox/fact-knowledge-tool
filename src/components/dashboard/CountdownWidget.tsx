import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Trash2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CountdownMode = 'finished' | 'countup';
export type CountdownVariant = 'compact' | 'medium' | 'hero';

export interface CountdownSettings {
  colorTheme: string;
  showSeconds: boolean;
  modeAfterEnd: CountdownMode;
}

export interface CountdownEvent {
  id: string;
  title: string;
  target_date: string;
  settings: CountdownSettings;
}

interface CountdownWidgetProps {
  event: CountdownEvent;
  variant?: CountdownVariant;
  onEdit?: (event: CountdownEvent) => void;
  onDelete?: (event: CountdownEvent) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ended: boolean;
}

const variantStyles: Record<CountdownVariant, string> = {
  compact: 'min-h-[170px]',
  medium: 'min-h-[220px]',
  hero: 'min-h-[280px] col-span-full',
};

const segmentStyles: Record<CountdownVariant, string> = {
  compact: 'text-xl',
  medium: 'text-3xl',
  hero: 'text-4xl md:text-5xl',
};

function calculateTimeLeft(targetDate: string, modeAfterEnd: CountdownMode): TimeLeft {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const delta = target - now;

  if (delta <= 0 && modeAfterEnd === 'finished') {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  }

  const absoluteDelta = Math.abs(delta);
  const days = Math.floor(absoluteDelta / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absoluteDelta / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absoluteDelta / (1000 * 60)) % 60);
  const seconds = Math.floor((absoluteDelta / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    ended: delta <= 0,
  };
}

function useCountdown(targetDate: string, showSeconds: boolean, modeAfterEnd: CountdownMode) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    setTick(Date.now());
    const intervalMs = showSeconds ? 1000 : 60000;
    const interval = window.setInterval(() => setTick(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [showSeconds, targetDate]);

  return useMemo(() => {
    void tick;
    return calculateTimeLeft(targetDate, modeAfterEnd);
  }, [modeAfterEnd, targetDate, tick]);
}

function formatUnit(value: number) {
  return value.toString().padStart(2, '0');
}

export function CountdownWidget({ event, variant = 'medium', onEdit, onDelete }: CountdownWidgetProps) {
  const { days, hours, minutes, seconds, ended } = useCountdown(
    event.target_date,
    event.settings.showSeconds,
    event.settings.modeAfterEnd,
  );

  const accentStyle = useMemo(
    () => ({
      borderColor: event.settings.colorTheme,
      background: `${event.settings.colorTheme}12`,
    }),
    [event.settings.colorTheme],
  );

  return (
    <Card className={cn('border-l-4 transition-all', variantStyles[variant])} style={accentStyle}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold leading-tight">{event.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {new Date(event.target_date).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })} UTC
            </p>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(event)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 md:gap-5">
          {[
            { label: 'Dias', value: days },
            { label: 'Horas', value: hours },
            { label: 'Min', value: minutes },
            ...(event.settings.showSeconds ? [{ label: 'Seg', value: seconds }] : []),
          ].map((part) => (
            <div key={part.label} className="text-center min-w-[60px]">
              <p className={cn('font-bold text-foreground tabular-nums', segmentStyles[variant])}>{formatUnit(part.value)}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{part.label}</p>
            </div>
          ))}
          <Badge variant={ended ? 'secondary' : 'default'} className="ml-auto">
            {ended
              ? event.settings.modeAfterEnd === 'countup'
                ? 'A contar desde o fim'
                : 'Terminado'
              : 'A decorrer'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
