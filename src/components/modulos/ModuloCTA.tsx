import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuloActivo } from '@/hooks/useModuloActivo';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { Modulo } from '@/types/modulos';
import { toast } from '@/hooks/use-toast';

interface Props {
  modulo: Modulo;
  size?: 'default' | 'lg';
}

export function ModuloCTA({ modulo, size = 'lg' }: Props) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { moduloSlug, setModulo, isChanging, isLoading } = useModuloActivo();
  const { role } = useWorkspaceRole();

  if (loading || isLoading) {
    return (
      <Button size={size} disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />A carregar
      </Button>
    );
  }

  if (!user) {
    return (
      <Button size={size} onClick={() => navigate(`/login?redirect=/modulos/${modulo.slug}`)}>
        Experimentar <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    );
  }

  const canEdit = role === 'owner' || role === 'admin' || role === 'editor';

  if (moduloSlug === modulo.slug) {
    return (
      <Button size={size} onClick={() => navigate(modulo.rotaPrincipal ?? '/dashboard')}>
        Abrir módulo <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    );
  }

  const handleActivate = () => {
    if (!canEdit) return;
    setModulo(modulo.slug);
    toast({ title: 'Módulo activado', description: `${modulo.nome} é agora o módulo activo.` });
    setTimeout(() => navigate(modulo.rotaPrincipal ?? '/dashboard'), 300);
  };

  if (!canEdit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button size={size} disabled>Activar módulo</Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Apenas owner, admin ou editor podem trocar o módulo activo.</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button size={size} onClick={handleActivate} disabled={isChanging}>
      {isChanging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
      Activar este módulo
    </Button>
  );
}
