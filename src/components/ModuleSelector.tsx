import { Scale, Dog, Code, LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { modulos } from '@/data/modulos';
import { ModuloSlug } from '@/types/modulos';

const iconMap: Record<string, LucideIcon> = {
  Scale,
  Dog,
  Code,
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {modulos.map((mod) => {
          const Icon = iconMap[mod.icone];
          const isActive = activeSlug === mod.slug;

          return (
            <Card
              key={mod.slug}
              onClick={() => onSelect(mod.slug)}
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                isActive ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
            >
              <CardHeader className="items-center text-center gap-2">
                {Icon && <Icon className="h-8 w-8 text-primary" />}
                <CardTitle className="text-lg">{mod.nome}</CardTitle>
                <CardDescription>{mod.descricao}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
