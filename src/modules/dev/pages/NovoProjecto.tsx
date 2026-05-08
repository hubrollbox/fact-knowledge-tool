import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { toast } from '@/hooks/use-toast';
import { useCreateProjecto } from '../hooks/useProjectos';

export function NovoProjecto() {
  const navigate = useNavigate();
  const create = useCreateProjecto();
  const [form, setForm] = useState({
    nome: '', descricao: '', repo_url: '', docs_url: '', deploy_url: '',
    stack: '', versao_actual: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    const urlFields: Array<['repo_url' | 'docs_url' | 'deploy_url', string]> = [
      ['repo_url', form.repo_url], ['docs_url', form.docs_url], ['deploy_url', form.deploy_url],
    ];
    for (const [k, v] of urlFields) {
      if (v.trim() && !/^https?:\/\//i.test(v.trim())) {
        toast({ title: 'URL inválido', description: `${k} deve começar por http:// ou https://`, variant: 'destructive' });
        return;
      }
    }
    try {
      const created = await create.mutateAsync({
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        repo_url: form.repo_url || null,
        docs_url: form.docs_url || null,
        deploy_url: form.deploy_url || null,
        versao_actual: form.versao_actual || null,
        stack: form.stack
          ? form.stack.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
      });
      toast({ title: 'Projecto criado' });
      navigate(`/dev/projecto/${created.id}`);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/dev">Dev</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Novo projecto</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" onClick={() => navigate('/dev')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Novo projecto</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="repo">URL do repositório</Label>
              <Input id="repo" value={form.repo_url} onChange={(e) => set('repo_url', e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div>
              <Label htmlFor="docs">URL da documentação</Label>
              <Input id="docs" value={form.docs_url} onChange={(e) => set('docs_url', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="deploy">URL de deploy</Label>
              <Input id="deploy" value={form.deploy_url} onChange={(e) => set('deploy_url', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="versao">Versão actual</Label>
              <Input id="versao" value={form.versao_actual} onChange={(e) => set('versao_actual', e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="stack">Stack (separar por vírgulas)</Label>
              <Input id="stack" value={form.stack} onChange={(e) => set('stack', e.target.value)} placeholder="React, TypeScript, Supabase" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/dev')}>Cancelar</Button>
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
