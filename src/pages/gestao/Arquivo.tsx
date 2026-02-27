import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Archive, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatarData } from '@/lib/utils-fkt';
import type { Processo } from '@/types';

export default function Arquivo() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from('processos').select('*, cliente:clientes(id,nome)').eq('user_id', user.id).eq('estado', 'arquivado').order('updated_at', { ascending: false });
    setProcessos((data as Processo[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const handleRestore = async (id: string) => {
    await supabase.from('processos').update({ estado: 'em_analise' }).eq('id', id);
    setProcessos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Arquivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{processos.length} processo{processos.length !== 1 ? 's' : ''} arquivado{processos.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : processos.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum processo arquivado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {processos.map(p => (
              <Card key={p.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link to={`/processos/${p.id}`} className="text-sm font-medium text-foreground hover:underline">{p.titulo}</Link>
                      <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="capitalize">{p.tipo}</span>
                        {p.materia && <span>· {p.materia}</span>}
                        {p.cliente && <span>· {(p.cliente as { nome: string }).nome}</span>}
                        <span>· Arquivado em {formatarData(p.updated_at)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRestore(p.id)} className="shrink-0">
                      <RefreshCw className="h-3 w-3 mr-1" />Restaurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
