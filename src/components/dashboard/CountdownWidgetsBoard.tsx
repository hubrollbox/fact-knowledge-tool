import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, TimerReset } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountdownEvent, CountdownMode, CountdownWidget } from './CountdownWidget';

const defaultForm = {
  title: '',
  targetDate: '',
  colorTheme: '#2563eb',
  showSeconds: true,
  modeAfterEnd: 'finished' as CountdownMode,
};

function toUtcISOString(value: string) {
  return new Date(value).toISOString();
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export function CountdownWidgetsBoard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('countdown_events')
      .select('id, title, target_date, settings')
      .eq('user_id', user.id)
      .order('target_date', { ascending: true });
    setEvents((data as unknown as CountdownEvent[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (event: CountdownEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      targetDate: toDatetimeLocal(event.target_date),
      colorTheme: event.settings.colorTheme,
      showSeconds: event.settings.showSeconds,
      modeAfterEnd: event.settings.modeAfterEnd,
    });
    setOpen(true);
  };

  const saveEvent = async () => {
    if (!user || !form.title || !form.targetDate) return;

    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      target_date: toUtcISOString(form.targetDate),
      settings: {
        colorTheme: form.colorTheme,
        showSeconds: form.showSeconds,
        modeAfterEnd: form.modeAfterEnd,
      },
    };

    if (editingId) {
      await supabase.from('countdown_events').update(payload).eq('id', editingId).eq('user_id', user.id);
    } else {
      await supabase.from('countdown_events').insert(payload);
    }

    setOpen(false);
    resetForm();
    void loadEvents();
  };

  const removeEvent = async (event: CountdownEvent) => {
    if (!user) return;
    await supabase.from('countdown_events').delete().eq('id', event.id).eq('user_id', user.id);
    setEvents((prev) => prev.filter((item) => item.id !== event.id));
  };

  const variants = useMemo(() => ['hero', 'medium', 'compact'] as const, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Countdown Widgets</h2>
          <p className="text-sm text-muted-foreground">Blocos independentes reutilizáveis em qualquer página.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Countdown
        </Button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-44 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <TimerReset className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Ainda não existem countdowns criados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((event, idx) => (
            <CountdownWidget
              key={event.id}
              event={event}
              variant={variants[idx % variants.length]}
              onEdit={openEdit}
              onDelete={removeEvent}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Countdown' : 'Novo Countdown'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Data e hora (UTC)</Label>
              <Input
                id="targetDate"
                type="datetime-local"
                value={form.targetDate}
                onChange={(e) => setForm((prev) => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorTheme">Tema / Cor</Label>
              <Input
                id="colorTheme"
                type="color"
                className="h-11 p-1"
                value={form.colorTheme}
                onChange={(e) => setForm((prev) => ({ ...prev, colorTheme: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showSeconds">Mostrar segundos</Label>
              <Switch
                id="showSeconds"
                checked={form.showSeconds}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showSeconds: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Modo após terminar</Label>
              <Select
                value={form.modeAfterEnd}
                onValueChange={(value: CountdownMode) => setForm((prev) => ({ ...prev, modeAfterEnd: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finished">Terminado</SelectItem>
                  <SelectItem value="countup">Contagem crescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveEvent}>{editingId ? 'Guardar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
