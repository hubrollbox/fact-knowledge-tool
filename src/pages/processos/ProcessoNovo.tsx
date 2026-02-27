import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cliente } from '@/types';

export default function ProcessoNovo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'academico' as 'academico' | 'profissional',
    estado: 'em_analise',
    materia: '',
    descricao: '',
    cliente_id: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome').then(({ data }) => {
      setClientes((data as Cliente[]) || []);
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.titulo.trim()) { setError('O título é obrigatório.'); return; }
    setSaving(true);
    setError(null);

    const { data, error } = await supabase.from('processos').insert({
      user_id: user.id,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      estado: form.estado,
      materia: form.materia.trim() || null,
      descricao: form.descricao.trim() || null,
      cliente_id: (form.tipo === 'profissional' && form.cliente_id) ? form.cliente_id : null,
    }).select().single();

    if (error) { setError(error.message); setSaving(false); return; }
    navigate(`/processos/${data.id}`);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/processos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Processo</h1>
            <p className="text-sm text-muted-foreground">Crie um novo processo de análise factual</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Informações do Processo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Análise do Contrato de Arrendamento"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as 'academico' | 'profissional' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academico">Académico</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado inicial</Label>
                  <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="em_progresso">Em Progresso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.tipo === 'profissional' && (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem cliente</SelectItem>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="materia">Matéria / Área</Label>
                <Input
                  id="materia"
                  value={form.materia}
                  onChange={e => setForm(f => ({ ...f, materia: e.target.value }))}
                  placeholder="Ex: Direito Civil, Direito Penal..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Breve descrição do processo..."
                  rows={4}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/processos')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'A criar...' : 'Criar Processo'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
