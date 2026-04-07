import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProcesso } from '../hooks/useProcessos';
import { useState } from 'react';
import { toast } from 'sonner';

const tipos = ['cível', 'penal', 'administrativo', 'laboral', 'outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessoNovoDialog({ open, onOpenChange }: Props) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('cível');
  const [tribunal, setTribunal] = useState('');
  const create = useCreateProcesso();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    try {
      await create.mutateAsync({ titulo: titulo.trim(), tipo, tribunal: tribunal || null });
      toast.success('Processo criado');
      setTitulo('');
      setTipo('cível');
      setTribunal('');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar processo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Processo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Acção de despejo — Rua X" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tribunal">Tribunal</Label>
            <Input id="tribunal" value={tribunal} onChange={(e) => setTribunal(e.target.value)} placeholder="Ex: Tribunal Judicial da Comarca de Lisboa" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!titulo.trim() || create.isPending}>
              {create.isPending ? 'A criar...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
