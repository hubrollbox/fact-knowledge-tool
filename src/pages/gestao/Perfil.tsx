import { useEffect, useState } from 'react';
import { Mail, Calendar, HardDrive, Cloud, Github, LogOut, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SERVICES = [
  { key: 'google_drive', label: 'Google Drive', icon: HardDrive, desc: 'Sincronizar ficheiros e documentos' },
  { key: 'onedrive', label: 'OneDrive', icon: Cloud, desc: 'Sincronizar ficheiros Microsoft' },
  { key: 'gmail', label: 'Gmail / Email', icon: Mail, desc: 'Integrar caixa de email pessoal' },
  { key: 'google_calendar', label: 'Google Calendar', icon: Calendar, desc: 'Sincronizar calendário e prazos' },
  { key: 'github', label: 'GitHub', icon: Github, desc: 'Repositórios e controlo de versões' },
] as const;

type ServiceState = Record<string, boolean>;

export default function Perfil() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceState>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchServices = async () => {
      const { data } = await supabase
        .from('user_services')
        .select('service, connected')
        .eq('user_id', user.id);
      const map: ServiceState = {};
      data?.forEach((s) => { map[s.service] = s.connected; });
      setServices(map);
      setLoading(false);
    };
    fetchServices();
  }, [user]);

  const toggleService = async (serviceKey: string) => {
    if (!user) return;
    setToggling(serviceKey);
    const isConnected = !!services[serviceKey];

    if (isConnected) {
      // Disconnect
      await supabase
        .from('user_services')
        .update({ connected: false, connected_at: null })
        .eq('user_id', user.id)
        .eq('service', serviceKey);
      setServices((prev) => ({ ...prev, [serviceKey]: false }));
      toast({ title: 'Serviço desconectado' });
    } else {
      // Connect (upsert)
      await supabase
        .from('user_services')
        .upsert(
          { user_id: user.id, service: serviceKey, connected: true, connected_at: new Date().toISOString() },
          { onConflict: 'user_id,service' }
        );
      setServices((prev) => ({ ...prev, [serviceKey]: true }));
      toast({ title: 'Serviço conectado' });
    }
    setToggling(null);
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
              {SERVICES.map(({ key, label, icon: Icon, desc }) => {
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
                            {connected ? 'Conectado' : 'Desconectado'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Button
                        variant={connected ? 'outline' : 'default'}
                        size="sm"
                        disabled={isToggling}
                        onClick={() => toggleService(key)}
                      >
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        {connected ? 'Desconectar' : 'Conectar'}
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
