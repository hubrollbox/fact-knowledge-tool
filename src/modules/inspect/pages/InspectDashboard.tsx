import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { inspectDb, InspectClient, InspectEstablishment, InspectOrganisation } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Building2, Users, Link2, XCircle } from 'lucide-react';

function InspectPortfolio() {
  const { workspace, moduloSlug, isLoading: workspaceLoading } = useModuloActivo();
  const queryClient = useQueryClient();
  const [organisationType, setOrganisationType] = useState<'consultant' | 'operator' | 'hybrid'>('consultant');
  const [organisationName, setOrganisationName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [establishmentActivity, setEstablishmentActivity] = useState('');
  const [establishmentAddress, setEstablishmentAddress] = useState('');
  const [establishmentLocality, setEstablishmentLocality] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState('');
  const [editingEstablishment, setEditingEstablishment] = useState<string | null>(null);
  const [editingEstablishmentName, setEditingEstablishmentName] = useState('');
  const [busy, setBusy] = useState(false);

  const organisationQuery = useQuery({
    queryKey: ['inspect-organisation', workspace?.id],
    enabled: !!workspace && moduloSlug === 'inspect',
    queryFn: async () => {
      const { data, error } = await inspectDb.from('inspect_organisations').select('*').eq('workspace_id', workspace!.id).maybeSingle();
      if (error) throw error;
      return data as InspectOrganisation | null;
    },
  });
  const organisation = organisationQuery.data;

  const clientsQuery = useQuery({
    queryKey: ['inspect-clients', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await inspectDb.from('inspect_clients').select('*').eq('inspect_organisation_id', organisation!.id).order('display_name');
      if (error) throw error;
      return data as InspectClient[];
    },
  });
  const establishmentsQuery = useQuery({
    queryKey: ['inspect-establishments', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await inspectDb.from('inspect_establishments').select('*').eq('inspect_organisation_id', organisation!.id).order('display_name');
      if (error) throw error;
      return data as InspectEstablishment[];
    },
  });
  const relationsQuery = useQuery({
    queryKey: ['inspect-client-establishments', organisation?.id],
    enabled: !!organisation,
    queryFn: async () => {
      const { data, error } = await inspectDb.from('inspect_client_establishments').select('*').eq('inspect_organisation_id', organisation!.id).order('valid_from', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inspect-organisation', workspace?.id] }),
      queryClient.invalidateQueries({ queryKey: ['inspect-clients', organisation?.id] }),
      queryClient.invalidateQueries({ queryKey: ['inspect-establishments', organisation?.id] }),
      queryClient.invalidateQueries({ queryKey: ['inspect-client-establishments', organisation?.id] }),
    ]);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); await refresh(); toast({ title: 'Registo guardado' }); }
    catch (error) { toast({ title: 'Não foi possível guardar', description: error instanceof Error ? error.message : 'Erro inesperado', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const createOrganisation = (event: FormEvent) => {
    event.preventDefault();
    if (!workspace) return;
    void run(async () => {
      const { error } = await inspectDb.from('inspect_organisations').insert({
        workspace_id: workspace.id, organisation_type: organisationType, display_name: organisationName.trim(),
      });
      if (error) throw error;
      setOrganisationName('');
    });
  };
  const createClient = (event: FormEvent) => {
    event.preventDefault();
    if (!organisation) return;
    void run(async () => {
      const { error } = await inspectDb.from('inspect_clients').insert({
        inspect_organisation_id: organisation.id, display_name: clientName.trim(),
        external_reference: clientReference.trim() || null,
      });
      if (error) throw error;
      setClientName(''); setClientReference('');
    });
  };
  const createEstablishment = (event: FormEvent) => {
    event.preventDefault();
    if (!organisation) return;
    void run(async () => {
      const { error } = await inspectDb.from('inspect_establishments').insert({
        inspect_organisation_id: organisation.id, display_name: establishmentName.trim(),
        activity_description: establishmentActivity.trim() || null,
        address_line: establishmentAddress.trim() || null, locality: establishmentLocality.trim() || null,
      });
      if (error) throw error;
      setEstablishmentName(''); setEstablishmentActivity(''); setEstablishmentAddress(''); setEstablishmentLocality('');
    });
  };
  const createRelation = (event: FormEvent) => {
    event.preventDefault();
    if (!organisation || !selectedClient || !selectedEstablishment) return;
    void run(async () => {
      const { error } = await inspectDb.from('inspect_client_establishments').insert({
        inspect_organisation_id: organisation.id, client_id: selectedClient, establishment_id: selectedEstablishment,
      });
      if (error) throw error;
    });
  };
  const saveClient = (id: string) => void run(async () => {
    const { error } = await inspectDb.from('inspect_clients').update({ display_name: editingClientName.trim() }).eq('id', id);
    if (error) throw error;
    setEditingClient(null); setEditingClientName('');
  });
  const saveEstablishment = (id: string) => void run(async () => {
    const { error } = await inspectDb.from('inspect_establishments').update({ display_name: editingEstablishmentName.trim() }).eq('id', id);
    if (error) throw error;
    setEditingEstablishment(null); setEditingEstablishmentName('');
  });
  const endRelation = (id: string) => void run(async () => {
    const { error } = await inspectDb.from('inspect_client_establishments').update({ valid_until: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  });

  if (workspaceLoading || organisationQuery.isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (!workspace) return <p className="p-8">Não existe um workspace associado a esta conta.</p>;
  if (moduloSlug !== 'inspect') return <div className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-semibold">FKT Inspect</h1><p className="mt-2 text-muted-foreground">A gestão de carteira só está disponível quando o workspace tiver o módulo Inspect activo. Não alterámos o módulo activo desta conta.</p></div>;
  if (organisationQuery.isError) return <p className="p-8 text-destructive">Não foi possível carregar a organização Inspect. Verifica as permissões e a migração da base de dados.</p>;

  if (!organisation) return (
    <div className="mx-auto max-w-xl p-6">
      <Card><CardHeader><CardTitle>Configurar organização Inspect</CardTitle></CardHeader><CardContent>
        <p className="mb-4 text-sm text-muted-foreground">Define o tipo de utilização desta organização. Esta configuração é única por workspace.</p>
        <form onSubmit={createOrganisation} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="inspect-org-name">Nome da organização</Label><Input id="inspect-org-name" value={organisationName} onChange={e => setOrganisationName(e.target.value)} minLength={2} maxLength={160} required /></div>
          <div className="space-y-2"><Label>Perfil</Label><Select value={organisationType} onValueChange={v => setOrganisationType(v as typeof organisationType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="consultant">Consultor / auditor</SelectItem><SelectItem value="operator">Empresa / operador</SelectItem><SelectItem value="hybrid">Ambos</SelectItem></SelectContent></Select></div>
          <Button type="submit" disabled={busy || organisationName.trim().length < 2}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar organização</Button>
        </form>
      </CardContent></Card>
    </div>
  );

  const clients = clientsQuery.data ?? [];
  const establishments = establishmentsQuery.data ?? [];
  const relations = relationsQuery.data ?? [];
  const loading = clientsQuery.isLoading || establishmentsQuery.isLoading || relationsQuery.isLoading;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div><p className="text-sm font-medium text-muted-foreground">FKT Inspect</p><h1 className="text-2xl font-semibold tracking-tight">Carteira de clientes e estabelecimentos</h1><p className="mt-1 text-sm text-muted-foreground">{organisation.display_name} · gestão de relações e histórico</p></div>
      {loading ? <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Clientes</CardTitle></CardHeader><CardContent className="space-y-4">
              <form onSubmit={createClient} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input aria-label="Nome do cliente" placeholder="Nome do cliente" value={clientName} onChange={e => setClientName(e.target.value)} minLength={2} maxLength={180} required />
                <Input aria-label="Referência externa" placeholder="Referência (opcional)" value={clientReference} onChange={e => setClientReference(e.target.value)} maxLength={120} />
                <Button type="submit" disabled={busy || clientName.trim().length < 2}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
              </form>
              <div className="divide-y">{clients.map(client => <div key={client.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1">{editingClient === client.id ? <div className="flex gap-2"><Input value={editingClientName} onChange={e => setEditingClientName(e.target.value)} aria-label="Novo nome do cliente" maxLength={180} /><Button size="sm" onClick={() => saveClient(client.id)} disabled={busy || editingClientName.trim().length < 2}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingClient(null)}>Cancelar</Button></div> : <><p className="truncate font-medium">{client.display_name}</p><p className="text-xs text-muted-foreground">{client.external_reference || 'Sem referência externa'}</p></>}</div>{editingClient !== client.id && <Button size="sm" variant="outline" onClick={() => { setEditingClient(client.id); setEditingClientName(client.display_name); }}>Editar</Button>}</div>)}{clients.length === 0 && <p className="py-4 text-sm text-muted-foreground">Ainda não existem clientes.</p>}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Estabelecimentos</CardTitle></CardHeader><CardContent className="space-y-4">
              <form onSubmit={createEstablishment} className="space-y-2">
                <Input aria-label="Nome do estabelecimento" placeholder="Nome do estabelecimento" value={establishmentName} onChange={e => setEstablishmentName(e.target.value)} minLength={2} maxLength={180} required />
                <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Actividade" placeholder="Actividade (opcional)" value={establishmentActivity} onChange={e => setEstablishmentActivity(e.target.value)} /><Input aria-label="Localidade" placeholder="Localidade" value={establishmentLocality} onChange={e => setEstablishmentLocality(e.target.value)} /></div>
                <Input aria-label="Morada" placeholder="Morada (opcional)" value={establishmentAddress} onChange={e => setEstablishmentAddress(e.target.value)} />
                <Button type="submit" disabled={busy || establishmentName.trim().length < 2}><Plus className="mr-1 h-4 w-4" />Adicionar estabelecimento</Button>
              </form>
              <div className="divide-y">{establishments.map(item => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1">{editingEstablishment === item.id ? <div className="flex gap-2"><Input value={editingEstablishmentName} onChange={e => setEditingEstablishmentName(e.target.value)} aria-label="Novo nome do estabelecimento" maxLength={180} /><Button size="sm" onClick={() => saveEstablishment(item.id)} disabled={busy || editingEstablishmentName.trim().length < 2}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditingEstablishment(null)}>Cancelar</Button></div> : <><p className="font-medium">{item.display_name}</p><p className="text-xs text-muted-foreground">{[item.activity_description,item.locality].filter(Boolean).join(' · ') || 'Sem detalhes adicionais'}</p></>}</div>{editingEstablishment !== item.id && <Button size="sm" variant="outline" onClick={() => { setEditingEstablishment(item.id); setEditingEstablishmentName(item.display_name); }}>Editar</Button>}</div>)}{establishments.length === 0 && <p className="py-4 text-sm text-muted-foreground">Ainda não existem estabelecimentos.</p>}</div>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Link2 className="h-5 w-5" /> Relações cliente / estabelecimento</CardTitle></CardHeader><CardContent className="space-y-4">
            <form onSubmit={createRelation} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Select value={selectedClient} onValueChange={setSelectedClient}><SelectTrigger aria-label="Cliente"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger><SelectContent>{clients.filter(x => x.status === 'active').map(x => <SelectItem key={x.id} value={x.id}>{x.display_name}</SelectItem>)}</SelectContent></Select>
              <Select value={selectedEstablishment} onValueChange={setSelectedEstablishment}><SelectTrigger aria-label="Estabelecimento"><SelectValue placeholder="Seleccionar estabelecimento" /></SelectTrigger><SelectContent>{establishments.filter(x => x.status === 'active').map(x => <SelectItem key={x.id} value={x.id}>{x.display_name}</SelectItem>)}</SelectContent></Select>
              <Button type="submit" disabled={busy || !selectedClient || !selectedEstablishment}>Associar</Button>
            </form>
            <div className="divide-y">{relations.map(relation => {
              const client = clients.find(x => x.id === relation.client_id);
              const establishment = establishments.find(x => x.id === relation.establishment_id);
              return <div key={relation.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{client?.display_name ?? 'Cliente indisponível'} → {establishment?.display_name ?? 'Estabelecimento indisponível'}</p><p className="text-xs text-muted-foreground">Desde {new Date(relation.valid_from).toLocaleDateString('pt-PT')}{relation.valid_until ? ` · Terminada em ${new Date(relation.valid_until).toLocaleDateString('pt-PT')}` : ' · Activa'}</p></div>{!relation.valid_until && <Button type="button" variant="ghost" size="sm" onClick={() => endRelation(relation.id)} disabled={busy} aria-label="Terminar associação"><XCircle className="mr-1 h-4 w-4" />Terminar</Button>}</div>;
            })}{relations.length === 0 && <p className="py-4 text-sm text-muted-foreground">Ainda não existem associações activas.</p>}</div>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}

export default function InspectDashboard() {
  return <ProtectedRoute><AppLayout><InspectPortfolio /></AppLayout></ProtectedRoute>;
}
