import { useCallback, useEffect, useState } from 'react';
import { Timer, Plus, Trash2, Pencil, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CountdownEvent } from './CountdownWidget';
import { cn } from '@/lib/utils';

function timeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return 'Terminado';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function CountdownFab() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('countdown_events')
      .select('id, title, target_date, settings')
      .eq('user_id', user.id)
      .order('target_date', { ascending: true });
    setEvents((data as unknown as CountdownEvent[] | null) ?? []);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Refresh every minute
  useEffect(() => {
    const interval = setInterval(() => setEvents(e => [...e]), 60000);
    return () => clearInterval(interval);
  }, []);

  const create = async () => {
    if (!user || !title.trim() || !targetDate) return;
    await supabase.from('countdown_events').insert({
      user_id: user.id,
      title: title.trim(),
      target_date: new Date(targetDate).toISOString(),
      settings: { colorTheme: '#2563eb', showSeconds: true, modeAfterEnd: 'finished' },
    });
    setTitle('');
    setTargetDate('');
    setShowForm(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!user) return;
    await supabase.from('countdown_events').delete().eq('id', id).eq('user_id', user.id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <Timer className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Countdowns</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(f => !f)}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {showForm && (
            <div className="border-b p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Prazo recurso" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data/hora</Label>
                <Input type="datetime-local" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <Button size="sm" className="w-full" onClick={create} disabled={!title.trim() || !targetDate}>
                Criar
              </Button>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Sem countdowns</p>
            ) : (
              events.map(event => (
                <div key={event.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{timeLeft(event.target_date)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => remove(event.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
