import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Calendar, HardDrive, Cloud, Github, LogOut, Loader2, ExternalLink, Key, Eye, EyeOff } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  // OAuth credentials state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    const service = searchParams.get('service');
    const message = searchParams.get('message');

    if (oauthResult === 'success') {
      toast({ title: 'Serviço conectado com sucesso', description: `${service} foi conectado.` });
      if (user) fetchServices();
    } else if (oauthResult === 'error') {
      toast({
        title: 'Erro na conexão OAuth',
        description: message || 'Não foi possível conectar o serviço.',
        variant: 'destructive',
      });
    }

    if (oauthResult) {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentials = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_oauth_credentials')
        .select('client_id, client_secret')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setClientId(data.client_id);
        setClientSecret(data.client_secret);
        setHasCredentials(true);
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchCredentials();
    }
  }, [user]);

  const saveCredentials = async () => {
    if (!user || !clientId.trim() || !clientSecret.trim()) {
      toast({ title: 'Preenche ambos os campos', variant: 'destructive' });
      return;
    }

    setSavingCredentials(true);
    try {
      const { error } = await supabase
        .from('user_oauth_credentials')
        .upsert(
          {
            user_id: user.id,
            provider: 'google',
            client_id: clientId.trim(),
            client_secret: clientSecret.trim(),
          },
          { onConflict: 'user_id,provider' }
        );

      if (error) throw error;

      setHasCredentials(true);
      toast({ title: 'Credenciais guardadas com sucesso' });
    } catch (error) {
      console.error('Erro ao guardar credenciais:', error);
      toast({
        title: 'Erro ao guardar credenciais',
        description: 'Não foi possível guardar as credenciais OAuth.',
        variant: 'destructive',
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  const connectOAuthService = async (serviceKey: string) => {
    if (!session?.access_token) return;

    if (!hasCredentials) {
      toast({
        title: 'Credenciais em falta',
        description: 'Configura as tuas credenciais Google OAuth antes de conectar serviços.',
        variant: 'destructive',
      });
      return;
    }

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
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', serviceKey);

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

        {/* Google OAuth Credentials */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Credenciais Google OAuth</CardTitle>
            </div>
            <CardDescription>
              Introduz o Client ID e Client Secret do teu projeto na{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google Cloud Console
              </a>
              . Estas credenciais são necessárias para conectar os serviços Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                placeholder="123456789.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="client-secret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="GOCSPX-..."
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveCredentials} disabled={savingCredentials} size="sm">
                {savingCredentials && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {hasCredentials ? 'Atualizar' : 'Guardar'}
              </Button>
              {hasCredentials && (
                <Badge variant="default" className="text-[10px]">Configurado</Badge>
              )}
            </div>
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
                const googleDisabled = oauth && !hasCredentials && !connected;
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
                        <p className="text-xs text-muted-foreground">
                          {googleDisabled ? 'Configura as credenciais Google acima para conectar' : desc}
                        </p>
                      </div>
                      <Button
                        variant={connected ? 'outline' : 'default'}
                        size="sm"
                        disabled={isToggling || (!oauth && !connected) || googleDisabled}
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
