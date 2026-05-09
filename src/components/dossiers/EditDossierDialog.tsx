import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ESTADO_LABELS } from '@/lib/utils-fkt';
import type { Dossier } from '@/types';

interface EditDossierDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dossier: Dossier;
  onSaved?: () => void;
}

export function EditDossierDialog({ open, onOpenChange, dossier, onSaved }: EditDossierDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: dossier.titulo,
    tipo: dossier.tipo,
    estado: dossier.estado,
    materia: dossier.materia ?? '',
    descricao: dossier.descricao ?? '',
    cliente_id: dossier.cliente_id ?? '',
  });
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome')
      .then(({ data }) => setClientes(data || []));
  }, [user, open]);

  useEffect(() => {
    setForm({
      titulo: dossier.titulo, tipo: dossier.tipo, estado: dossier.estado,
      materia: dossier.materia ?? '', descricao: dossier.descricao ?? '',
      cliente_id: dossier.cliente_id ?? '',
    });
  }, [dossier]);

  const handleSave = async () => {
    if (!form.titulo.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('dossiers').update({
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      estado: form.estado,
      materia: form.materia.trim() || null,
      descricao: form.descricao.trim() || null,
      cliente_id: form.cliente_id || null,
    }).eq('id', dossier.id).eq('user_id', user.id);
    setSaving(false);
    if (error) { toast.error('Erro ao guardar dossier'); return; }
    toast.success('Dossier atualizado');
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Dossier</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: any) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academico">Académico</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v: any) => setForm((f) => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Matéria</Label>
            <Input value={form.materia} onChange={(e) => setForm((f) => ({ ...f, materia: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={form.cliente_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.titulo.trim()}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
