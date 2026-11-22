import { PageHeader } from '@/modules/experience/components/PageHeader';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Archive, FileText, UserCircle, ChevronRight, Landmark, Inbox } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';

const cards = [
  { label: 'Perfil', desc: 'Dados da conta e serviços sincronizados', href: '/gestao/perfil', icon: UserCircle },
  { label: 'Clientes', desc: 'Gerir clientes e os seus processos', href: '/gestao/clientes', icon: Users },
  { label: 'Arquivo', desc: 'Processos arquivados e restauração', href: '/gestao/arquivo', icon: Archive },
  { label: 'Relatórios', desc: 'Gerar relatórios FIRAC e exportar', href: '/gestao/relatorios', icon: FileText },
  { label: 'Tesouraria', desc: 'Gestão da conta corrente e movimentos', href: '/gestao/tesouraria', icon: Landmark, Inbox },
];

export default function Gestao() {
  const { data: isGlobalAdmin } = useQuery({ queryKey: ['is-fkt-global-admin'], queryFn: async () => { const { data } = await supabase.rpc('is_fkt_global_admin'); return data === true; } });
  const visible = isGlobalAdmin ? [...cards, { label: 'Pedidos de piloto', desc: 'Contactos recebidos e estado de admissão', href: '/gestao/pedidos-piloto', icon: Inbox }] : cards;
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Gestão" description={<>Hub de gestão e administração</>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(({ label, desc, href, icon: Icon }) => (
            <Link key={label} to={href}>
              <Card className="border-border hover:border-foreground/20 transition-colors h-full cursor-pointer">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-1">{label} <ChevronRight className="h-4 w-4 text-muted-foreground" /></h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
