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
  const totalMovimentado = totais.creditos + totais.debitos;
  const percentagemCreditos = totalMovimentado === 0 ? 50 : (totais.creditos / totalMovimentado) * 100;
  const percentagemDebitos = 100 - percentagemCreditos;

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
            <CardTitle>Balança financeira</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                <p className="text-xs uppercase tracking-wide">Receitas</p>
                <p className="text-xl font-semibold">{moeda.format(totais.creditos)}</p>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-right">
                <p className="text-xs uppercase tracking-wide">Despesas</p>
                <p className="text-xl font-semibold">{moeda.format(totais.debitos)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${percentagemCreditos}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Receitas: {percentagemCreditos.toFixed(1)}%</span>
                <span>Despesas: {percentagemDebitos.toFixed(1)}%</span>
              </div>
            </div>

            <div className="relative h-20">
              <div className="absolute inset-x-2 top-9 h-1 rounded-full bg-border" />
              <div className="absolute left-1/2 top-8 h-3 w-3 -translate-x-1/2 rounded-full bg-primary" />
              <div
                className="absolute top-9 h-1 rounded-full bg-emerald-500 transition-all"
                style={{ left: '50%', width: `${Math.max(0, percentagemCreditos - 50) * 2}%` }}
              />
              <div
                className="absolute top-9 h-1 rounded-full bg-red-500 transition-all"
                style={{ right: '50%', width: `${Math.max(0, percentagemDebitos - 50) * 2}%` }}
              />
              <div className="absolute left-2 top-2 text-xs font-medium text-emerald-600">Receitas</div>
              <div className="absolute right-2 top-2 text-xs font-medium text-red-600">Despesas</div>
              <div className={`absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold ${saldo >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {saldo >= 0 ? 'Mais receitas' : 'Mais despesas'}
              </div>
            </div>
          </CardContent>
        </Card>

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
