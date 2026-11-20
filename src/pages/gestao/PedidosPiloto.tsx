import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Pedido = Tables<'pilot_access_requests'>;
const ESTADOS: Record<string, string> = { new: 'Novo', contacted: 'Contactado', closed: 'Fechado' };

export default function PedidosPiloto() {
  const qc = useQueryClient();
  const [pesquisa, setPesquisa] = useState('');
  const [estado, setEstado] = useState('all');

  const admin = useQuery({
    queryKey: ['is-fkt-global-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_fkt_global_admin');
      if (error) throw error;
      return data === true;
    },
  });

  const pedidos = useQuery({
    queryKey: ['pilot-access-requests'],
    enabled: admin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.from('pilot_access_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Pedido[];
    },
  });

  const mudarEstado = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('pilot_access_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pilot-access-requests'] }); toast.success('Estado actualizado'); },
    onError: (e: Error) => toast.error(e.message || 'Não foi possível actualizar.'),
  });

  const lista = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    return (pedidos.data ?? []).filter(p =>
      (estado === 'all' || p.status === estado) &&
      (!q || [p.name, p.email, p.role_company].some(v => v.toLowerCase().includes(q))));
  }, [pedidos.data, pesquisa, estado]);

  if (admin.isLoading) return <AppLayout><div className="p-6 text-sm text-muted-foreground">A carregar…</div></AppLayout>;
  if (!admin.data) return <Navigate to="/gestao" replace />;

  const contagem = (s: string) => (pedidos.data ?? []).filter(p => p.status === s).length;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de piloto</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Contactos recebidos pelo formulário público</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(ESTADOS).map(([k, l]) => (
            <Card key={k}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{contagem(k)}</p></CardContent></Card>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Pesquisar nome, email ou empresa" value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(ESTADOS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {pedidos.isLoading ? <p className="text-sm text-muted-foreground">A carregar pedidos…</p>
          : pedidos.error ? <p className="text-sm text-destructive">Não foi possível carregar os pedidos.</p>
          : lista.length === 0 ? <p className="text-sm text-muted-foreground">Sem pedidos.</p>
          : (
          <div className="space-y-3">
            {lista.map(p => (
              <Card key={p.id}><CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.name}</span>
                    {p.works_count != null && <Badge variant="secondary">{p.works_count} obras</Badge>}
                  </div>
                  <a href={`mailto:${p.email}`} className="text-sm underline break-all">{p.email}</a>
                  <p className="text-sm text-muted-foreground">{p.role_company}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString('pt-PT')}</p>
                </div>
                <Select value={p.status} onValueChange={status => mudarEstado.mutate({ id: p.id, status })}>
                  <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ESTADOS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
