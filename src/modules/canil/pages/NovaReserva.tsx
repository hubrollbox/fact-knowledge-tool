import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from '@/hooks/use-toast';
import { useAnimais } from '../hooks/useAnimais';
import { useCreateReserva } from '../hooks/useReservaCreate';

export function NovaReserva() {
  const navigate = useNavigate();
  const { data: animais } = useAnimais();
  const create = useCreateReserva();
  const [form, setForm] = useState({
    animal_id: '', data_entrada: '', data_saida: '', box: '',
    preco_dia: '', instrucoes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.animal_id || !form.data_entrada || !form.data_saida) {
      toast({ title: 'Preenche animal e datas', variant: 'destructive' });
      return;
    }
    try {
      await create.mutateAsync({
        animal_id: form.animal_id,
        data_entrada: form.data_entrada,
        data_saida: form.data_saida,
        box: form.box || null,
        preco_dia: form.preco_dia ? Number(form.preco_dia) : null,
        instrucoes: form.instrucoes || null,
      });
      toast({ title: 'Reserva criada' });
      navigate('/canil/agenda');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/canil">Canil</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Nova reserva</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" onClick={() => navigate('/canil')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Nova reserva</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="animal">Animal *</Label>
              <Select value={form.animal_id} onValueChange={(v) => set('animal_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar animal" /></SelectTrigger>
                <SelectContent>
                  {animais?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}{a.raca ? ` · ${a.raca}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entrada">Data de entrada *</Label>
              <Input id="entrada" type="date" value={form.data_entrada} onChange={(e) => set('data_entrada', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="saida">Data de saída *</Label>
              <Input id="saida" type="date" value={form.data_saida} onChange={(e) => set('data_saida', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="box">Box</Label>
              <Input id="box" value={form.box} onChange={(e) => set('box', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="preco">Preço/dia (€)</Label>
              <Input id="preco" type="number" step="0.01" value={form.preco_dia} onChange={(e) => set('preco_dia', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="instr">Instruções</Label>
              <Textarea id="instr" value={form.instrucoes} onChange={(e) => set('instrucoes', e.target.value)} rows={3} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/canil')}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Criar reserva
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
