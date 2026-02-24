import { useEffect, useState } from 'react';
import { Mail, LinkIcon, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function EmailWidget() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from('user_services')
        .select('connected')
        .eq('user_id', user.id)
        .eq('service', 'gmail')
        .maybeSingle();
      setConnected(!!data?.connected);
      setLoading(false);
    };
    check();
  }, [user]);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email
        </CardTitle>
        {!connected && !loading && (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/gestao/perfil" className="text-xs text-muted-foreground">
              <LinkIcon className="h-3 w-3 mr-1" />
              Ligar Gmail
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
        ) : !connected ? (
          <div className="text-center py-8">
            <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Gmail não conectado</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Liga a tua conta no Perfil para ver os emails recentes
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/gestao/perfil">Configurar no Perfil</Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">Gmail conectado</p>
            <p className="text-xs text-muted-foreground mt-1">
              A integração com leitura de emails será activada em breve.
            </p>
            <div className="mt-4 space-y-2">
              {/* Placeholder items */}
              {[
                { from: 'Notificações', subject: 'A sincronização está activa', time: 'agora' },
              ].map((email, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm text-foreground truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{email.from} · {email.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
