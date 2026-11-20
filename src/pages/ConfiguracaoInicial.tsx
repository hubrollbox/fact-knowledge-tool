import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { modulos } from '@/data/modulos';
import { ModuloSlug } from '@/types/modulos';
import { ModuloIcon } from '@/components/modulos/ModuloIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Footer } from '@/components/layout/Footer';
import { toast } from '@/hooks/use-toast';

export default function ConfiguracaoInicial() {
  const { user, loading: authLoading } = useAuth();
  const { workspace, moduloSlug, isLoading, createWorkspace, isCreatingWorkspace, setModulo, isChanging } = useModuloActivo();
  const { canWrite, isLoading: roleLoading } = useWorkspaceRole();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [modulo, setModuloEscolhido] = useState<ModuloSlug | ''>('');

  if (!authLoading && !user) return <Navigate to="/login" replace />;
  if (!authLoading && !isLoading && workspace && moduloSlug) return <Navigate to={modulos.find(m => m.slug === moduloSlug)?.rotaPrincipal ?? '/dashboard'} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!modulo) return;
    try {
      if (workspace) {
        if (!canWrite) {
          toast({ title: 'Sem permissões', description: 'Peça ao administrador do workspace para alterar o módulo.', variant: 'destructive' });
          return;
        }
        await setModulo(modulo);
      } else {
        await createWorkspace({ slug: modulo, name: nome.trim() || 'O meu espaço FKT' });
      }
      navigate(modulos.find(m => m.slug === modulo)?.rotaPrincipal ?? '/dashboard', { replace: true });
    } catch {
      // A mensagem de erro é apresentada pelo hook.
    }
  };

  if (authLoading || isLoading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground">FKT · CONFIGURAÇÃO INICIAL</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{workspace ? 'Escolha o módulo de trabalho' : 'Vamos preparar o seu espaço FKT'}</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {workspace ? 'A sua conta utiliza um único módulo activo de cada vez. A alteração aplica-se ao workspace.' : 'A sua conta terá um workspace principal. Escolha o módulo com que pretende começar; poderá mudar mais tarde.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {!workspace && (
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome do espaço de trabalho</Label>
              <Input id="workspace-name" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Escritório, Empresa ou Nome próprio" maxLength={100} />
              <p className="text-xs text-muted-foreground">Pode alterar este nome mais tarde.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {modulos.filter(m => !m.emPreparacao).map(item => (
              <button key={item.slug} type="button" onClick={() => setModuloEscolhido(item.slug)} className={`rounded-lg border p-4 text-left transition-colors ${modulo === item.slug ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`} aria-pressed={modulo === item.slug}>
                <div className="flex items-center gap-3">
                  <ModuloIcon name={item.icone} className="h-6 w-6 text-primary" />
                  <span className="font-semibold">{item.nome}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.tagline ?? item.descricao}</p>
                {modulo === item.slug && <p className="mt-3 text-xs font-medium text-primary">Seleccionado</p>}
              </button>
            ))}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={!modulo || isCreatingWorkspace || isChanging || (workspace && !canWrite)}>
            {(isCreatingWorkspace || isChanging) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
