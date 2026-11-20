import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCreateAdr } from '../hooks/useAdrs';
import { Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  { key: 'contexto', label: 'Contexto', hint: 'Situação técnica actual relevante para a decisão.' },
  { key: 'problema', label: 'Problema', hint: 'Que decisão é preciso tomar e porquê agora.' },
  { key: 'alternativas', label: 'Alternativas', hint: 'Opções consideradas, mesmo as descartadas.' },
  { key: 'analise', label: 'Análise', hint: 'Trade-offs entre as alternativas.' },
  { key: 'decisao', label: 'Decisão', hint: 'A escolha feita e a justificação.' },
] as const;

export function ADRForm({ projectoId, open, onOpenChange }: Props) {
  const create = useCreateAdr();
  const [titulo, setTitulo] = useState('');
  const [valores, setValores] = useState<Record<string, string>>({});

  const reset = () => {
    setTitulo('');
    setValores({});
  };

  const submit = async () => {
    if (!titulo.trim()) {
      toast.error('Indica um título para o ADR');
      return;
    }
    try {
      await create.mutateAsync({
        projecto_id: projectoId,
        titulo: titulo.trim(),
        contexto: valores.contexto ?? null,
        problema: valores.problema ?? null,
        alternativas: valores.alternativas ?? null,
        analise: valores.analise ?? null,
        decisao: valores.decisao ?? null,
        estado: 'proposto',
      });
      toast.success('ADR registado');
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao guardar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Architecture Decision Record</DialogTitle>
          <DialogDescription className="flex items-start gap-2 pt-2">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>Regista o raciocínio, não só a decisão. Quem ler isto daqui a um ano deve perceber porquê.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Adoptar PostgreSQL como base de dados primária"
            />
          </div>

          {SECTIONS.map((s) => (
            <div key={s.key} className="space-y-1.5 rounded-md border bg-muted/20 p-3">
              <Label htmlFor={s.key} className="text-sm font-semibold">{s.label}</Label>
              <p className="text-xs text-muted-foreground">{s.hint}</p>
              <Textarea
                id={s.key}
                value={valores[s.key] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [s.key]: e.target.value }))}
                rows={4}
                className="bg-background"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Guardar ADR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
