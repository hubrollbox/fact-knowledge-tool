import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Calendar, HardDrive, Cloud, Github, LogOut, Loader2, ExternalLink, KeyRound, Eye, EyeOff } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface GoogleCredentials {
  client_id: string;
  client_secret: string;
}

export default function Perfil() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceState>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [serviceEmail, setServiceEmail] = useState('');

  // Google OAuth credentials state
  const [credentials, setCredentials] = useState<GoogleCredentials>({ client_id: '', client_secret: '' });
  const [savedCredentials, setSavedCredentials] = useState(false);
  const [credLoading, setCredLoading] = useState(true);
  const [credSaving, setCredSaving] = useState(false);
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
      const details = message === 'email_mismatch'
        ? 'A conta Google autenticada não corresponde ao email indicado.'
        : message || 'Não foi possível conectar o serviço.';
      toast({ title: 'Erro na conexão OAuth', description: details, variant: 'destructive' });
    }

    if (oauthResult) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

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
        setCredentials({ client_id: data.client_id, client_secret: data.client_secret });
        setSavedCredentials(true);
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    } finally {
      setCredLoading(false);
    }
  };

  const saveCredentials = async () => {
    if (!user || !credentials.client_id.trim() || !credentials.client_secret.trim()) return;
    setCredSaving(true);

    try {
      const { error } = await supabase
        .from('user_oauth_credentials')
        .upsert(
          {
            user_id: user.id,
            provider: 'google',
            client_id: credentials.client_id.trim(),
            client_secret: credentials.client_secret.trim(),
          },
          { onConflict: 'user_id,provider' }
        );

      if (error) throw error;

      setSavedCredentials(true);
      toast({ title: 'Credenciais guardadas' });
    } catch (error) {
      console.error('Erro ao guardar credenciais:', error);
      toast({ title: 'Erro ao guardar credenciais', variant: 'destructive' });
    } finally {
      setCredSaving(false);
    }
  };

  const fetchServices = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_services')
        .select('service, connected')
        .eq('user_id', user.id);

      if (error) throw error;

      const map: ServiceState = {};
      data?.forEach((s) => { map[s.service] = s.connected; });
      setServices(map);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast({ title: 'Erro ao carregar conexões', description: 'Não foi possível obter o estado dos serviços externos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchCredentials();
    }
  }, [user]);

  const connectOAuthService = async (serviceKey: string, selectedEmail?: string) => {
    if (!session?.access_token) return;
    setToggling(serviceKey);

    try {
      const res = await supabase.functions.invoke('oauth-google', {
        body: { service: serviceKey, serviceEmail: selectedEmail?.trim() || undefined },
      });

      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (error) {
      console.error('OAuth error:', error);
      toast({ title: 'Erro ao iniciar conexão', description: 'Não foi possível iniciar o fluxo OAuth. Tenta novamente.', variant: 'destructive' });
      setToggling(null);
    }
  };

  const disconnectService = async (serviceKey: string) => {
    if (!user) return;
    setToggling(serviceKey);

    try {
      await supabase.from('oauth_tokens').delete().eq('user_id', user.id).eq('provider', serviceKey);
      const { error } = await supabase.from('user_services').update({ connected: false, connected_at: null }).eq('user_id', user.id).eq('service', serviceKey);
      if (error) throw error;

      setServices((prev) => ({ ...prev, [serviceKey]: false }));
      toast({ title: 'Serviço desconectado' });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({ title: 'Erro ao desconectar', variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const toggleService = async (serviceKey: string, isOAuth: boolean) => {
    const isConnected = !!services[serviceKey];
    if (isConnected) {
      await disconnectService(serviceKey);
    } else if (isOAuth) {
      setPendingService(serviceKey);
      setServiceEmail(user?.email ?? '');
    } else {
      toast({ title: 'Em breve', description: 'A integração com este serviço será disponibilizada em breve.' });
    }
  };

  const confirmOAuthConnection = async () => {
    if (!pendingService) return;
    const targetService = pendingService;
    setPendingService(null);
    await connectOAuthService(targetService, serviceEmail);
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const isGoogleService = (key: string) => ['google_drive', 'gmail', 'google_calendar'].includes(key);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
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
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Credenciais Google OAuth
            </CardTitle>
            <CardDescription>
              Introduz o Client ID e Client Secret do teu projeto Google Cloud para conectar serviços Google.
              {' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Obter credenciais
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {credLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input
                    id="google-client-id"
                    value={credentials.client_id}
                    onChange={(e) => {
                      setCredentials((prev) => ({ ...prev, client_id: e.target.value }));
                      setSavedCredentials(false);
                    }}
                    placeholder="123456789.apps.googleusercontent.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-client-secret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="google-client-secret"
                      type={showSecret ? 'text' : 'password'}
                      value={credentials.client_secret}
                      onChange={(e) => {
                        setCredentials((prev) => ({ ...prev, client_secret: e.target.value }));
                        setSavedCredentials(false);
                      }}
                      placeholder="GOCSPX-..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={saveCredentials}
                    disabled={credSaving || !credentials.client_id.trim() || !credentials.client_secret.trim()}
                  >
                    {credSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Guardar
                  </Button>
                  {savedCredentials && (
                    <Badge variant="default" className="text-[10px]">Guardado</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Redirect URI obrigatório no Google Cloud Console:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
                    https://gllrqrqonwuacjxbtgnp.supabase.co/functions/v1/oauth-callback
                  </code>
                </p>
              </>
            )}
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
            <TooltipProvider>
              <div className="grid gap-3">
                {SERVICES.map(({ key, label, icon: Icon, desc, oauth }) => {
                  const connected = !!services[key];
                  const isToggling = toggling === key;
                  const needsCredentials = isGoogleService(key) && !savedCredentials && !connected;

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
                        {needsCredentials ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="default" size="sm" disabled>
                                  <ExternalLink className="h-3 w-3 mr-1" /> Conectar
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Guarda as credenciais Google OAuth primeiro</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
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
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

      <Dialog open={!!pendingService} onOpenChange={(open) => !open && setPendingService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="service-email">Email do serviço</Label>
            <Input
              id="service-email"
              type="email"
              value={serviceEmail}
              onChange={(e) => setServiceEmail(e.target.value)}
              placeholder="email@exemplo.pt"
            />
            <p className="text-xs text-muted-foreground">
              Vamos abrir a autenticação Google e pedir seleção explícita de conta para este email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingService(null)}>Cancelar</Button>
            <Button onClick={confirmOAuthConnection} disabled={!serviceEmail.trim()}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
