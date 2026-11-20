import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useCriarObra } from '../hooks/useObras';

export function NovaObra() {
  const nav = useNavigate();
  const criar = useCriarObra();
  const [f, setF] = useState({ nome: '', codigo: '', morada: '', dono_obra: '', data_inicio: '', data_prevista_fim: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const o = await criar.mutateAsync({
      nome: f.nome.trim(), codigo: f.codigo || null, morada: f.morada || null, dono_obra: f.dono_obra || null,
      data_inicio: f.data_inicio || null, data_prevista_fim: f.data_prevista_fim || null,
    });
    nav(`/obras/${o.id}`);
  };
  return (
    <div className="max-w-xl space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/obras"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link></Button>
      <Card>
        <CardHeader><CardTitle>Nova obra</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nome</Label><Input required maxLength={200} value={f.nome} onChange={set('nome')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={f.codigo} onChange={set('codigo')} /></div>
              <div><Label>Dono de obra</Label><Input value={f.dono_obra} onChange={set('dono_obra')} /></div>
            </div>
            <div><Label>Morada</Label><Input value={f.morada} onChange={set('morada')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="date" value={f.data_inicio} onChange={set('data_inicio')} /></div>
              <div><Label>Conclusão prevista</Label><Input type="date" value={f.data_prevista_fim} onChange={set('data_prevista_fim')} /></div>
            </div>
            <Button type="submit" disabled={criar.isPending}>Criar obra</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
