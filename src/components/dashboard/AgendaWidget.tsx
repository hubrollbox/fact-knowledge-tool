import { useEffect, useState } from 'react';
import { Calendar, Clock, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AgendaItem {
  id: string;
  titulo: string;
  data: string;
  tipo: 'documento' | 'facto' | 'processo';
  processoId: string;
  processoTitulo?: string;
}

export function AgendaWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Check if Google Calendar is connected
      const { data: svc } = await supabase
        .from('user_services')
        .select('connected')
        .eq('user_id', user.id)
        .eq('service', 'google_calendar')
        .maybeSingle();
      setConnected(!!svc?.connected);

      // Load recent dates from documentos and factos
      const now = new Date().toISOString().split('T')[0];
      const [docRes, factoRes] = await Promise.all([
        supabase
          .from('documentos')
          .select('id, titulo, data_documento, processo_id, processos!inner(user_id, titulo)')
          .eq('processos.user_id', user.id)
          .not('data_documento', 'is', null)
          .gte('data_documento', now)
          .order('data_documento', { ascending: true })
          .limit(5),
        supabase
          .from('factos')
          .select('id, descricao, data_facto, processo_id, processos!inner(user_id, titulo)')
          .eq('processos.user_id', user.id)
          .not('data_facto', 'is', null)
          .gte('data_facto', now)
          .order('data_facto', { ascending: true })
          .limit(5),
      ]);

      const agenda: AgendaItem[] = [];

      (docRes.data || []).forEach((d: any) => {
        agenda.push({
          id: d.id,
          titulo: d.titulo,
          data: d.data_documento,
          tipo: 'documento',
          processoId: d.processo_id,
          processoTitulo: d.processos?.titulo,
        });
      });

      (factoRes.data || []).forEach((f: any) => {
        agenda.push({
          id: f.id,
          titulo: f.descricao.substring(0, 60) + (f.descricao.length > 60 ? '…' : ''),
          data: f.data_facto,
          tipo: 'facto',
          processoId: f.processo_id,
          processoTitulo: f.processos?.titulo,
        });
      });

      agenda.sort((a, b) => a.data.localeCompare(b.data));
      setItems(agenda.slice(0, 6));
      setLoading(false);
    };
    load();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    if (diff === 0) return { label: 'Hoje', formatted, urgent: true };
    if (diff === 1) return { label: 'Amanhã', formatted, urgent: true };
    if (diff <= 7) return { label: `${diff} dias`, formatted, urgent: false };
    return { label: formatted, formatted, urgent: false };
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, string> = {
      documento: 'Doc',
      facto: 'Facto',
      processo: 'Proc',
    };
    return map[tipo] || tipo;
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Agenda
        </CardTitle>
        {!connected && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/gestao/perfil" className="text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3 mr-1" />
              Ligar Calendar
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sem eventos próximos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Datas de documentos e factos aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const { label, urgent } = formatDate(item.data);
              return (
                <Link
                  key={`${item.tipo}-${item.id}`}
                  to={`/processos/${item.processoId}`}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className={`flex items-center justify-center h-8 w-14 rounded text-xs font-medium shrink-0 ${
                    urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                  }`}>
                    {label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate group-hover:underline">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.processoTitulo}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {tipoBadge(item.tipo)}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
