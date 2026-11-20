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
import { useCreateAnimal } from '../hooks/useAnimais';

export function NovoAnimal() {
  const navigate = useNavigate();
  const create = useCreateAnimal();
  const [form, setForm] = useState({
    nome: '', raca: '', sexo: '', data_nascimento: '',
    numero_chip: '', numero_lop: '',
    proprietario_nome: '', proprietario_contacto: '',
    observacoes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    try {
      const created = await create.mutateAsync({
        nome: form.nome.trim(),
        raca: form.raca || null,
        sexo: form.sexo || null,
        data_nascimento: form.data_nascimento || null,
        numero_chip: form.numero_chip || null,
        numero_lop: form.numero_lop || null,
        proprietario_nome: form.proprietario_nome || null,
        proprietario_contacto: form.proprietario_contacto || null,
        observacoes: form.observacoes || null,
      });
      toast({ title: 'Animal criado' });
      navigate(`/canil/animal/${created.id}`);
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
            <BreadcrumbItem><BreadcrumbPage>Novo animal</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" onClick={() => navigate('/canil')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Novo animal</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="raca">Raça</Label>
              <Input id="raca" value={form.raca} onChange={(e) => set('raca', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => set('sexo', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Macho</SelectItem>
                  <SelectItem value="femea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data">Data de nascimento</Label>
              <Input id="data" type="date" value={form.data_nascimento} onChange={(e) => set('data_nascimento', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="chip">Nº Chip</Label>
              <Input id="chip" value={form.numero_chip} onChange={(e) => set('numero_chip', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lop">Nº LOP</Label>
              <Input id="lop" value={form.numero_lop} onChange={(e) => set('numero_lop', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="prop">Proprietário</Label>
              <Input id="prop" value={form.proprietario_nome} onChange={(e) => set('proprietario_nome', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="contacto">Contacto</Label>
              <Input id="contacto" value={form.proprietario_contacto} onChange={(e) => set('proprietario_contacto', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} rows={3} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/canil')}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
