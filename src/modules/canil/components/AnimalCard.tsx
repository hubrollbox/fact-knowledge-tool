import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dog, User } from 'lucide-react';
import type { Animal } from '../types/canil';

interface AnimalCardProps {
  animal: Animal;
  onClick?: () => void;
}

export function AnimalCard({ animal, onClick }: AnimalCardProps) {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted">
        {animal.foto_url ? (
          <img
            src={animal.foto_url}
            alt={animal.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Dog className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium leading-tight">{animal.nome}</div>
          {animal.sexo && (
            <Badge variant="outline" className="text-xs capitalize">
              {animal.sexo}
            </Badge>
          )}
        </div>
        {animal.raca && (
          <div className="text-xs text-muted-foreground">{animal.raca}</div>
        )}
        {animal.proprietario_nome && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{animal.proprietario_nome}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
