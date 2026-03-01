import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Calendar, HardDrive, Cloud, Github, LogOut, Loader2, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SERVICES = [
  { key: 'google_drive', label: 'Google Drive', icon: HardDrive, desc: 'Sincronizar ficheiros e documentos', oauth: true },
  { key: 'onedrive', label: 'OneDrive', icon: Cloud, desc: 'Sincronizar ficheiros Microsoft', oauth: false },
  { key: 'gmail', label: 'Gmail / Email', icon: Mail, desc: 'Integrar caixa de email pessoal', oauth: true },
  { key: 'google_calendar', label: 'Google Calendar', icon: Calendar, desc: 'Sincronizar calendário e prazos', oauth: true },
  { key: 'github', label: 'GitHub', icon: Github, desc: 'Repositórios e controlo de versões', oauth: false },
] as const;

type ServiceState = Record<string, boolean>;

export default function Perfil() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceState>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Handle OAuth callback params
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    const service = searchParams.get('service');
    const message = searchParams.get('message');

    if (oauthResult === 'success') {
      toast({ title: 'Serviço conectado com sucesso', description: `${service} foi conectado.` });
      // Refresh services
      if (user) fetchServices();
    } else if (oauthResult === 'error') {
      toast({
        title: 'Erro na conexão OAuth',
        description: message || 'Não foi possível conectar o serviço.',
        variant: 'destructive',
      });
    }

    if (oauthResult) {
      // Clear search params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchServices = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_services')
        .select('service, connected')
        .eq('user_id', user.id);

      if (error) throw error;

      const map: ServiceState = {};
      data?.forEach((s) => {
        map[s.service] = s.connected;
      });
      setServices(map);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast({
        title: 'Erro ao carregar conexões',
        description: 'Não foi possível obter o estado dos serviços externos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchServices();
  }, [user]);

  const connectOAuthService = async (serviceKey: string) => {
    if (!session?.access_token) return;
    setToggling(serviceKey);

    try {
      const res = await supabase.functions.invoke('oauth-google', {
        body: { service: serviceKey },
      });

      if (res.error) throw res.error;
      const { url } = res.data;

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: 'Erro ao iniciar conexão',
        description: 'Não foi possível iniciar o fluxo OAuth. Tenta novamente.',
        variant: 'destructive',
      });
      setToggling(null);
    }
  };

  const disconnectService = async (serviceKey: string) => {
    if (!user) return;
    setToggling(serviceKey);

    try {
      // Remove tokens
      await supabase
        .from('oauth_tokens' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('provider', serviceKey);

      // Update user_services
      const { error } = await supabase
        .from('user_services')
        .update({ connected: false, connected_at: null })
        .eq('user_id', user.id)
        .eq('service', serviceKey);

      if (error) throw error;

      setServices((prev) => ({ ...prev, [serviceKey]: false }));
      toast({ title: 'Serviço desconectado' });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({
        title: 'Erro ao desconectar',
        description: 'Não foi possível desconectar o serviço.',
        variant: 'destructive',
      });
    } finally {
      setToggling(null);
    }
  };

  const toggleService = async (serviceKey: string, isOAuth: boolean) => {
    const isConnected = !!services[serviceKey];

    if (isConnected) {
      await disconnectService(serviceKey);
    } else if (isOAuth) {
      await connectOAuthService(serviceKey);
    } else {
      // Non-OAuth services: show coming soon
      toast({
        title: 'Em breve',
        description: 'A integração com este serviço será disponibilizada em breve.',
      });
    }
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dados da conta e serviços sincronizados</p>
        </div>

        {/* Account info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-medium">{createdAt}</p>
              </div>
            </div>
            <Separator />
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Terminar sessão
            </Button>
          </CardContent>
        </Card>

        {/* Services */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Serviços externos</h2>
            <p className="text-sm text-muted-foreground">Conecta os teus serviços pessoais para sincronização</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3">
              {SERVICES.map(({ key, label, icon: Icon, desc, oauth }) => {
                const connected = !!services[key];
                const isToggling = toggling === key;
                return (
                  <Card key={key} className="border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{label}</p>
                          <Badge variant={connected ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {connected ? 'Conectado' : oauth ? 'Desconectado' : 'Em breve'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Button
                        variant={connected ? 'outline' : 'default'}
                        size="sm"
                        disabled={isToggling || (!oauth && !connected)}
                        onClick={() => toggleService(key, oauth)}
                      >
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        {connected ? 'Desconectar' : oauth ? (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Conectar
                          </span>
                        ) : 'Em breve'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
