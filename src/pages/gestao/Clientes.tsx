import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, User, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Cliente } from '@/types';

const emptyForm = { nome: '', email: '', telefone: '', morada: '' };

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [processosCounts, setProcessosCounts] = useState<Record<string, number>>({});

  const fetchAll = async () => {
    if (!user) return;
    const { data } = await supabase.from('clientes').select('*').eq('user_id', user.id).order('nome');
    setClientes((data as Cliente[]) || []);
    if (data && data.length > 0) {
      const ids = data.map((c: Cliente) => c.id);
      const { data: procs } = await supabase.from('processos').select('cliente_id').in('cliente_id', ids);
      const counts: Record<string, number> = {};
      ids.forEach(id => { counts[id] = 0; });
      (procs || []).forEach((p: { cliente_id: string }) => { if (counts[p.cliente_id] !== undefined) counts[p.cliente_id]++; });
      setProcessosCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Cliente) => { setEditing(c); setForm({ nome: c.nome, email: c.email || '', telefone: c.telefone || '', morada: c.morada || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.nome.trim() || !user) return;
    setSaving(true);
    const payload = { nome: form.nome.trim(), email: form.email.trim() || null, telefone: form.telefone.trim() || null, morada: form.morada.trim() || null };
    if (editing) {
      await supabase.from('clientes').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('clientes').insert({ ...payload, user_id: user.id });
    }
    await fetchAll();
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este cliente?')) return;
    await supabase.from('clientes').delete().eq('id', id);
    setClientes(prev => prev.filter(c => c.id !== id));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum cliente registado</p>
            <Button className="mt-4" onClick={openNew}>Adicionar primeiro cliente</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {clientes.map(c => (
              <Card key={c.id} className="border-border hover:border-foreground/20 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{c.nome}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        {c.email && <span>{c.email}</span>}
                        {c.telefone && <span>· {c.telefone}</span>}
                        {c.morada && <span>· {c.morada}</span>}
                      </div>
                      {processosCounts[c.id] !== undefined && (
                        <Link to={`/processos?cliente=${c.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors">
                          <FolderOpen className="h-3 w-3" />{processosCounts[c.id]} processo{processosCounts[c.id] !== 1 ? 's' : ''}
                        </Link>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.pt" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="+351 9xx xxx xxx" /></div>
            <div className="space-y-2"><Label>Morada</Label><Input value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} placeholder="Morada completa" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
