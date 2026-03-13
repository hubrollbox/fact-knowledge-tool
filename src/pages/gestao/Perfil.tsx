import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Calendar, HardDrive, Cloud, Github, LogOut, Loader2, ExternalLink, KeyRound, Eye, EyeOff, Info, HelpCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SERVICES = [
  { key: 'google_drive', label: 'Google Drive', icon: HardDrive, desc: 'Sincronizar ficheiros e documentos', oauth: true, provider: 'google' },
  { key: 'onedrive', label: 'OneDrive', icon: Cloud, desc: 'Sincronizar ficheiros Microsoft', oauth: true, provider: 'microsoft' },
  { key: 'gmail', label: 'Gmail / Email', icon: Mail, desc: 'Integrar caixa de email pessoal', oauth: true, provider: 'google' },
  { key: 'google_calendar', label: 'Google Calendar', icon: Calendar, desc: 'Sincronizar calendário e prazos', oauth: true, provider: 'google' },
  { key: 'github', label: 'GitHub', icon: Github, desc: 'Repositórios e controlo de versões', oauth: true, provider: 'github' },
] as const;

type ServiceState = Record<string, boolean>;

interface ProviderCredentials {
  client_id: string;
  client_secret: string;
}

type CredentialsMap = Record<string, ProviderCredentials>;
type SavedCredentialsMap = Record<string, boolean>;

export default function Perfil() {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceState>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [serviceEmail, setServiceEmail] = useState('');

  // OAuth credentials state
  const [credentials, setCredentials] = useState<CredentialsMap>({
    google: { client_id: '', client_secret: '' },
    microsoft: { client_id: '', client_secret: '' },
    github: { client_id: '', client_secret: '' },
  });
  const [savedCredentials, setSavedCredentials] = useState<SavedCredentialsMap>({
    google: false,
    microsoft: false,
    github: false,
  });
  const [credLoading, setCredLoading] = useState(true);
  const [credSaving, setCredSaving] = useState<string | null>(null);
  const [credTesting, setCredTesting] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

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
        ? 'A conta autenticada não corresponde ao email indicado.'
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
        .select('provider, client_id, client_secret')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        const newCreds = { ...credentials };
        const newSaved = { ...savedCredentials };
        data.forEach(c => {
          if (newCreds[c.provider]) {
            newCreds[c.provider] = { client_id: c.client_id, client_secret: c.client_secret };
            newSaved[c.provider] = true;
          }
        });
        setCredentials(newCreds);
        setSavedCredentials(newSaved);
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    } finally {
      setCredLoading(false);
    }
  };

  const saveProviderCredentials = async (provider: string) => {
    if (!user || !credentials[provider].client_id.trim() || !credentials[provider].client_secret.trim()) return;
    setCredSaving(provider);

    try {
      const { error } = await supabase
        .from('user_oauth_credentials')
        .upsert(
          {
            user_id: user.id,
            provider,
            client_id: credentials[provider].client_id.trim(),
            client_secret: credentials[provider].client_secret.trim(),
          },
          { onConflict: 'user_id,provider' }
        );

      if (error) throw error;

      setSavedCredentials(prev => ({ ...prev, [provider]: true }));
      toast({ title: `Credenciais ${provider} guardadas` });
    } catch (error) {
      console.error('Erro ao guardar credenciais:', error);
      toast({ title: 'Erro ao guardar credenciais', variant: 'destructive' });
    } finally {
      setCredSaving(null);
    }
  };

  const testProviderCredentials = async (provider: string) => {
    if (!user || !credentials[provider].client_id.trim() || !credentials[provider].client_secret.trim()) return;
    setCredTesting(provider);
    
    try {
      let url = '';
      if (provider === 'google') url = 'https://accounts.google.com/.well-known/openid-configuration';
      else if (provider === 'microsoft') url = 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration';
      else if (provider === 'github') url = 'https://api.github.com';

      const res = await fetch(url);
      if (res.ok) {
        toast({ title: 'Credenciais parecem válidas', description: 'O formato do Client ID e Secret está correcto.' });
      } else {
        throw new Error();
      }
    } catch (error) {
      toast({ title: 'Aviso', description: 'Não foi possível validar as credenciais automaticamente, mas foram guardadas.', variant: 'default' });
    } finally {
      setCredTesting(null);
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

    const serviceInfo = SERVICES.find(s => s.key === serviceKey);
    const provider = serviceInfo?.provider || 'google';

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('oauth-init', {
        body: { 
          service: serviceKey, 
          provider,
          serviceEmail: selectedEmail?.trim() || undefined 
        },
      });

      if (invokeError) {
        console.error('Invoke error:', invokeError);
        const details = await invokeError.context?.json?.() || invokeError.message;
        toast({ 
          title: 'Erro ao iniciar conexão', 
          description: details?.error || details || 'Não foi possível iniciar o fluxo OAuth.', 
          variant: 'destructive' 
        });
        setToggling(null);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de autenticação não recebida');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({ 
        title: 'Erro inesperado', 
        description: error.message || 'Ocorreu um erro ao tentar conectar o serviço.', 
        variant: 'destructive' 
      });
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

        {/* OAuth Credentials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Credenciais OAuth
            </CardTitle>
            <CardDescription>
              Configura as credenciais para cada fornecedor para ativar as integrações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="google">Google</TabsTrigger>
                <TabsTrigger value="microsoft">Microsoft</TabsTrigger>
                <TabsTrigger value="github">GitHub</TabsTrigger>
              </TabsList>

              {['google', 'microsoft', 'github'].map((provider) => (
                <TabsContent key={provider} value={provider} className="space-y-4 mt-0">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="tutorial" className="border-none">
                      <AccordionTrigger className="py-2 text-xs text-primary hover:no-underline flex gap-2">
                        <HelpCircle className="h-3 w-3" /> Como obter credenciais {provider}?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground space-y-3 pb-4">
                        {provider === 'google' && (
                          <ol className="list-decimal ml-4 space-y-1.5">
                            <li>Vai ao <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Google Cloud Console</a>.</li>
                            <li>Cria um projeto e ativa: Gmail, Drive e Calendar APIs.</li>
                            <li>Cria um "ID do cliente OAuth" (Aplicação Web).</li>
                          </ol>
                        )}
                        {provider === 'microsoft' && (
                          <ol className="list-decimal ml-4 space-y-1.5">
                            <li>Vai ao <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="underline text-foreground">Azure Portal &gt; App Registrations</a>.</li>
                            <li>Regista uma nova aplicação (Multitenant).</li>
                            <li>Em "Authentication", adiciona a plataforma "Web" com o URI abaixo.</li>
                            <li>Em "Certificates & secrets", cria um novo "Client secret".</li>
                          </ol>
                        )}
                        {provider === 'github' && (
                          <ol className="list-decimal ml-4 space-y-1.5">
                            <li>Vai a <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline text-foreground">GitHub Settings &gt; Developer settings</a>.</li>
                            <li>Cria uma nova "OAuth App".</li>
                            <li>Preenche o "Authorization callback URL" com o URI abaixo.</li>
                            <li>Gera um novo "Client secret".</li>
                          </ol>
                        )}
                        <Alert variant="default" className="bg-muted/50 border-none py-2 px-3">
                          <Info className="h-3.5 w-3.5" />
                          <AlertDescription className="text-[11px] leading-relaxed">
                            O Redirect URI deve ser configurado exatamente como mostrado abaixo.
                          </AlertDescription>
                        </Alert>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {credLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`${provider}-client-id`} className="text-xs">Client ID</Label>
                        <Input
                          id={`${provider}-client-id`}
                          value={credentials[provider].client_id}
                          onChange={(e) => {
                            setCredentials((prev) => ({
                              ...prev,
                              [provider]: { ...prev[provider], client_id: e.target.value }
                            }));
                            setSavedCredentials(prev => ({ ...prev, [provider]: false }));
                          }}
                          placeholder={provider === 'google' ? '12345.apps.googleusercontent.com' : 'ID da aplicação (client)'}
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${provider}-client-secret`} className="text-xs">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id={`${provider}-client-secret`}
                            type={showSecret[provider] ? 'text' : 'password'}
                            value={credentials[provider].client_secret}
                            onChange={(e) => {
                              setCredentials((prev) => ({
                                ...prev,
                                [provider]: { ...prev[provider], client_secret: e.target.value }
                              }));
                              setSavedCredentials(prev => ({ ...prev, [provider]: false }));
                            }}
                            placeholder="Valor do segredo do cliente"
                            className="h-9 text-sm font-mono pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setShowSecret(prev => ({ ...prev, [provider]: !prev[provider] }))}
                          >
                            {showSecret[provider] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          size="sm"
                          onClick={() => saveProviderCredentials(provider)}
                          disabled={credSaving === provider || !credentials[provider].client_id.trim() || !credentials[provider].client_secret.trim()}
                          className="px-4"
                        >
                          {credSaving === provider && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                          {savedCredentials[provider] ? 'Atualizar' : 'Guardar credenciais'}
                        </Button>
                        {savedCredentials[provider] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testProviderCredentials(provider)}
                            disabled={credTesting === provider}
                            className="h-8 text-xs"
                          >
                            {credTesting === provider && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                            Testar
                          </Button>
                        )}
                        {savedCredentials[provider] && (
                          <Badge variant="outline" className="text-[10px] border-primary text-primary bg-primary/5">Ativo</Badge>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Redirect URI obrigatório</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-[11px] font-mono break-all text-foreground bg-background px-2 py-1 rounded border border-border flex-1">
                  https://gllrqrqonwuacjxbtgnp.supabase.co/functions/v1/oauth-callback
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText('https://gllrqrqonwuacjxbtgnp.supabase.co/functions/v1/oauth-callback');
                    toast({ title: 'Copiado para o clipboard' });
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
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
            <TooltipProvider>
              <div className="grid gap-3">
                {SERVICES.map(({ key, label, icon: Icon, desc, oauth, provider }) => {
                  const connected = !!services[key];
                  const isToggling = toggling === key;
                  const hasProviderCreds = savedCredentials[provider];
                  const needsCredentials = oauth && !hasProviderCreds && !connected;

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
                              <p>Guarda as credenciais {provider} primeiro</p>
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
            <Label htmlFor="service-email">Email ou Utilizador do serviço</Label>
            <Input
              id="service-email"
              type="text"
              value={serviceEmail}
              onChange={(e) => setServiceEmail(e.target.value)}
              placeholder="email@exemplo.pt ou username"
            />
            <p className="text-xs text-muted-foreground">
              Vamos abrir a autenticação do fornecedor e pedir seleção explícita de conta.
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
