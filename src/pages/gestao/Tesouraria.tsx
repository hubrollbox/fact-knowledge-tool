import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Landmark, Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Movimento {
  id: string;
  descricao: string;
  tipo: 'credito' | 'debito';
  valor: number;
  data: string;
}

const moeda = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

const gerarId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function Tesouraria() {
  const { user } = useAuth();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [form, setForm] = useState({ descricao: '', tipo: 'credito' as 'credito' | 'debito', valor: '', data: new Date().toISOString().slice(0, 10) });

  const storageKey = user ? `fkt-tesouraria-${user.id}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setMovimentos([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Movimento[];
      setMovimentos(parsed);
    } catch {
      setMovimentos([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(movimentos));
  }, [movimentos, storageKey]);

  const totais = useMemo(() => {
    return movimentos.reduce((acc, item) => {
      if (item.tipo === 'credito') acc.creditos += item.valor;
      if (item.tipo === 'debito') acc.debitos += item.valor;
      return acc;
    }, { creditos: 0, debitos: 0 });
  }, [movimentos]);

  const saldo = totais.creditos - totais.debitos;

  const adicionarMovimento = () => {
    const valor = Number(form.valor.replace(',', '.'));
    if (!form.descricao.trim() || !form.data || Number.isNaN(valor) || valor <= 0) return;

    const novo: Movimento = {
      id: gerarId(),
      descricao: form.descricao.trim(),
      tipo: form.tipo,
      valor,
      data: form.data,
    };

    setMovimentos(prev => [novo, ...prev].sort((a, b) => b.data.localeCompare(a.data)));
    setForm(prev => ({ ...prev, descricao: '', valor: '' }));
  };

  const removerMovimento = (id: string) => {
    setMovimentos(prev => prev.filter(item => item.id !== id));
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tesouraria</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão da conta corrente: movimentos, saldos e controlo financeiro.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo atual</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{moeda.format(saldo)}</p>
              <Landmark className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total créditos</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold text-emerald-600">{moeda.format(totais.creditos)}</p>
              <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total débitos</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{moeda.format(totais.debitos)}</p>
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo movimento</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex.: Honorários processo X"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={form.tipo} onValueChange={(value: 'credito' | 'debito') => setForm(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="valor">Valor (€)</Label>
              <Input
                id="valor"
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
            <div className="md:col-span-5">
              <Button onClick={adicionarMovimento}><Plus className="h-4 w-4 mr-2" />Adicionar movimento</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentos da conta corrente</CardTitle>
          </CardHeader>
          <CardContent>
            {movimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentos registados.</p>
            ) : (
              <div className="space-y-2">
                {movimentos.map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.data).toLocaleDateString('pt-PT')} · {item.tipo === 'credito' ? 'Crédito' : 'Débito'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-semibold ${item.tipo === 'credito' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.tipo === 'credito' ? '+' : '-'}{moeda.format(item.valor)}
                      </p>
                      <Button variant="ghost" size="icon" onClick={() => removerMovimento(item.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
