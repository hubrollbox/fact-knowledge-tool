import { Link } from 'react-router-dom';
import { Users, Archive, FileText, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';

const cards = [
  { label: 'Clientes', desc: 'Gerir clientes e os seus processos', href: '/gestao/clientes', icon: Users },
  { label: 'Arquivo', desc: 'Processos arquivados e restauração', href: '/gestao/arquivo', icon: Archive },
  { label: 'Relatórios', desc: 'Gerar relatórios FIRAC e exportar', href: '/gestao/relatorios', icon: FileText },
];

export default function Gestao() {
  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hub de gestão e administração</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {cards.map(({ label, desc, href, icon: Icon }) => (
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
