import { FileText, Dog, Code, HardHat, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { modulos } from '@/data/modulos';
import { ModuloSlug } from '@/types/modulos';

const iconMap: Record<string, LucideIcon> = {
  Scale: FileText,
  Dog,
  Code,
  HardHat,
};

interface ModuleSelectorProps {
  onSelect: (slug: ModuloSlug) => void;
  activeSlug?: ModuloSlug | null;
}

export default function ModuleSelector({ onSelect, activeSlug }: ModuleSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Escolhe o módulo</h2>
        <p className="text-muted-foreground text-sm">Selecciona o contexto de trabalho para este workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        {modulos.filter((mod) => mod.slug !== 'inspect').map((mod) => {
          const Icon = iconMap[mod.icone];
          const isActive = activeSlug === mod.slug;

          return (
            <Card
              key={mod.slug}
              onClick={() => !mod.emPreparacao && onSelect(mod.slug)}
              aria-disabled={mod.emPreparacao}
              className={`transition-all ${mod.emPreparacao ? 'opacity-70 cursor-default' : 'cursor-pointer hover:shadow-md hover:border-primary/50'} ${
                isActive ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
            >
              <CardHeader className="items-center text-center gap-2">
                {Icon && <Icon className="h-8 w-8 text-primary" />}
                <CardTitle className="text-lg">{mod.nome}</CardTitle>
                {mod.destaque && (
                  <span className="text-[10px] uppercase tracking-wider border border-border rounded-full px-2 py-0.5 text-muted-foreground">
                    {mod.destaque ?? (mod.emPreparacao ? 'Em preparação' : null)}
                  </span>
                )}
                <CardDescription>{mod.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4">
                <Link
                  to={`/modulos/${mod.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Saber mais →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
