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
  compact: 'min-h-[135px]',
  medium: 'min-h-[160px]',
  hero: 'min-h-[180px] col-span-full',
};

const segmentStyles: Record<CountdownVariant, string> = {
  compact: 'text-sm',
  medium: 'text-base',
  hero: 'text-lg md:text-xl',
};

const circleSizeStyles: Record<CountdownVariant, string> = {
  compact: 'h-14 w-14',
  medium: 'h-16 w-16',
  hero: 'h-20 w-20',
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

function CircularUnit({
  label,
  value,
  max,
  color,
  variant,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  variant: CountdownVariant;
}) {
  const progress = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="text-center space-y-1">
      <div
        className={cn(
          'rounded-full grid place-items-center border border-border/50',
          circleSizeStyles[variant],
        )}
        style={{
          background: `conic-gradient(${color} ${progress}%, hsl(var(--muted)) ${progress}% 100%)`,
        }}
      >
        <div className="h-[80%] w-[80%] rounded-full bg-background grid place-items-center">
          <p className={cn('font-bold text-foreground tabular-nums', segmentStyles[variant])}>{formatUnit(value)}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
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
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">{event.title}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
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
      <CardContent className="px-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CircularUnit label="Dias" value={days} max={365} color={event.settings.colorTheme} variant={variant} />
          <CircularUnit label="Horas" value={hours} max={24} color={event.settings.colorTheme} variant={variant} />
          <CircularUnit label="Min" value={minutes} max={60} color={event.settings.colorTheme} variant={variant} />
          {event.settings.showSeconds && (
            <CircularUnit label="Seg" value={seconds} max={60} color={event.settings.colorTheme} variant={variant} />
          )}
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
