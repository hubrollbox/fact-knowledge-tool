import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateRegistoClinico } from '../hooks/useClinico';
import { toast } from '@/hooks/use-toast';

interface Props {
  animalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistoClinicoForm({ animalId, open, onOpenChange }: Props) {
  const create = useCreateRegistoClinico();
  const [tipo, setTipo] = useState('vacina');
  const [descricao, setDescricao] = useState('');
  const [dataRegisto, setDataRegisto] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dataProxima, setDataProxima] = useState('');
  const [produto, setProduto] = useState('');
  const [veterinario, setVeterinario] = useState('');
  const [custo, setCusto] = useState('');

  const reset = () => {
    setTipo('vacina');
    setDescricao('');
    setDataRegisto(new Date().toISOString().split('T')[0]);
    setDataProxima('');
    setProduto('');
    setVeterinario('');
    setCusto('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        animal_id: animalId,
        tipo,
        descricao: descricao || null,
        data_registo: dataRegisto,
        data_proxima: dataProxima || null,
        produto: produto || null,
        veterinario: veterinario || null,
        custo: custo ? parseFloat(custo) : null,
      });
      toast({ title: 'Registo adicionado' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message ?? 'Não foi possível guardar',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo registo clínico</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacina">Vacina</SelectItem>
                <SelectItem value="desparasitacao">Desparasitação</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="cirurgia">Cirurgia</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={dataRegisto}
                onChange={(e) => setDataRegisto(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Próxima</Label>
              <Input
                type="date"
                value={dataProxima}
                onChange={(e) => setDataProxima(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input value={produto} onChange={(e) => setProduto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Veterinário</Label>
              <Input
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
