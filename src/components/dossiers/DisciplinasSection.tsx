import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDossierDisciplinas } from '@/hooks/useDossierDisciplinas';

export function DisciplinasSection({ dossierId }: { dossierId: string }) {
  const { disciplinas, allDisciplinas, attach, detach, isLoading } = useDossierDisciplinas(dossierId);
  const [open, setOpen] = useState(false);

  const attachedIds = new Set(disciplinas.map((d) => d.id));
  const available = allDisciplinas.filter((d) => !attachedIds.has(d.id));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Conhecimento associado
          </CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={available.length === 0}>
                <Plus className="h-3.5 w-3.5 mr-1" />Associar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Pesquisar disciplina..." />
                <CommandList>
                  <CommandEmpty>Nenhuma disciplina disponível.</CommandEmpty>
                  <CommandGroup>
                    {available.map((d) => (
                      <CommandItem key={d.id} value={d.nome} onSelect={() => { attach(d.id); setOpen(false); }}>
                        {d.nome}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : disciplinas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma disciplina associada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disciplinas.map((d) => (
              <Badge key={d.link_id} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                <Link to={`/conhecimento/disciplinas/${d.id}`} className="hover:underline text-xs">
                  {d.nome}
                </Link>
                <button
                  onClick={() => detach(d.link_id)}
                  className="ml-1 rounded p-0.5 hover:bg-background/50"
                  aria-label={`Remover ${d.nome}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
