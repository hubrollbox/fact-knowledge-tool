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
  const [emails, setEmails] = useState<any[]>([]);

  const fetchEmails = async () => {
    try {
      const res = await supabase.functions.invoke('service-proxy', {
        body: { service: 'gmail', action: 'list_recent' },
      });
      if (res.error) throw res.error;
      setEmails(res.data || []);
    } catch (error) {
      console.error('Erro ao carregar emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from('user_services')
        .select('connected')
        .eq('user_id', user.id)
        .eq('service', 'gmail')
        .maybeSingle();
      
      const isConnected = !!data?.connected;
      setConnected(isConnected);
      
      if (isConnected) {
        await fetchEmails();
      } else {
        setLoading(false);
      }
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
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Emails Recentes</p>
              <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchEmails(); }} className="h-6 px-2 text-[10px]">
                <Inbox className="h-3 w-3 mr-1" /> Actualizar
              </Button>
            </div>
            {emails.length === 0 ? (
              <div className="text-center py-6">
                <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sem emails não lidos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {emails.map((email, i) => (
                  <div key={email.id || i} className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-colors group">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {email.from.split('<')[0].trim()}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {email.date ? new Date(email.date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 font-medium truncate mt-0.5">{email.subject}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 italic">{email.snippet}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-border/50 text-center">
              <p className="text-[10px] text-muted-foreground italic">
                <Info className="h-3 w-3 inline mr-1" />
                Sincronizado via Google API segura
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
