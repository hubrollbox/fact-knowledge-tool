import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Dog } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useAnimal } from '../hooks/useAnimais';
import { useRegistosClinicos } from '../hooks/useClinico';
import { useNinhadasDoAnimal } from '../hooks/useNinhadas';
import { RegistoClinicoForm } from '../components/RegistoClinicoForm';

export function AnimalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: animal, isLoading } = useAnimal(id);
  const { data: registos } = useRegistosClinicos(id);
  const { data: ninhadas } = useNinhadasDoAnimal(id);
  const [novoRegisto, setNovoRegisto] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!animal) {
    return <p className="text-muted-foreground">Animal não encontrado</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/canil">Canil</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{animal.nome}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button variant="outline" size="sm" onClick={() => navigate('/canil')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {animal.foto_url ? (
            <img src={animal.foto_url} alt={animal.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Dog className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{animal.nome}</h1>
          <div className="flex flex-wrap gap-1.5">
            {animal.raca && <Badge variant="outline">{animal.raca}</Badge>}
            {animal.sexo && <Badge variant="outline" className="capitalize">{animal.sexo}</Badge>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="ficha">
        <TabsList>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="clinico">Historial clínico</TabsTrigger>
          <TabsTrigger value="ninhadas">Ninhadas</TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Nome" value={animal.nome} />
              <Field label="Raça" value={animal.raca} />
              <Field label="Sexo" value={animal.sexo} />
              <Field
                label="Data de nascimento"
                value={
                  animal.data_nascimento
                    ? format(parseISO(animal.data_nascimento), 'd MMM yyyy', { locale: pt })
                    : null
                }
              />
              <Field label="Nº Chip" value={animal.numero_chip} />
              <Field label="Nº LOP" value={animal.numero_lop} />
              <Field label="Proprietário" value={animal.proprietario_nome} />
              <Field label="Contacto" value={animal.proprietario_contacto} />
              {animal.observacoes && (
                <div className="sm:col-span-2">
                  <Field label="Observações" value={animal.observacoes} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinico" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setNovoRegisto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar registo
            </Button>
          </div>
          {!registos?.length ? (
            <p className="text-sm text-muted-foreground">Sem registos clínicos</p>
          ) : (
            <div className="space-y-2">
              {registos.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{r.tipo}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(r.data_registo), 'd MMM yyyy', { locale: pt })}
                        </span>
                      </div>
                      {r.descricao && <p className="text-sm">{r.descricao}</p>}
                      <div className="text-xs text-muted-foreground">
                        {r.produto && <span>{r.produto} · </span>}
                        {r.veterinario && <span>{r.veterinario}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {r.data_proxima && (
                        <div>
                          Próximo: {format(parseISO(r.data_proxima), 'd MMM yyyy', { locale: pt })}
                        </div>
                      )}
                      {r.custo != null && <div className="font-medium">{r.custo}€</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {id && (
            <RegistoClinicoForm
              animalId={id}
              open={novoRegisto}
              onOpenChange={setNovoRegisto}
            />
          )}
        </TabsContent>

        <TabsContent value="ninhadas" className="mt-4 space-y-2">
          {!ninhadas?.length ? (
            <p className="text-sm text-muted-foreground">Não participou em ninhadas</p>
          ) : (
            ninhadas.map((n: any) => (
              <Card key={n.id}>
                <CardContent className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {n.data_parto
                          ? format(parseISO(n.data_parto), 'd MMM yyyy', { locale: pt })
                          : 'Sem data de parto'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Papel: {n.mae_id === id ? 'Mãe' : 'Pai'}
                        {n.numero_cachorros != null && ` · ${n.numero_cachorros} cachorros`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value || '—'}</div>
    </div>
  );
}
