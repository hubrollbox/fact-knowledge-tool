import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Loader2, FileText, Bug, Users } from 'lucide-react';
import { useProjecto } from '../hooks/useProjectos';
import { useIssues } from '../hooks/useIssues';
import { useAdrs } from '../hooks/useAdrs';
import { ADRForm } from '../components/ADRForm';
import type { IssueTipo, IssuePrioridade, IssueEstado } from '../types/dev';

const PRIORIDADE_VARIANT: Record<IssuePrioridade, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critica: 'destructive',
  alta: 'default',
  media: 'secondary',
  baixa: 'outline',
};

export function ProjectoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'projecto';
  const { data: projecto, isLoading } = useProjecto(id);
  const { data: issues } = useIssues(id);
  const { data: adrs } = useAdrs(id);
  const [adrOpen, setAdrOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('novo') === '1' && searchParams.get('tab') === 'adrs') {
      setAdrOpen(true);
    }
  }, [searchParams]);

  const [fTipo, setFTipo] = useState<string>('all');
  const [fPrio, setFPrio] = useState<string>('all');
  const [fEstado, setFEstado] = useState<string>('all');

  const issuesFiltradas = useMemo(() => {
    return (issues ?? []).filter((i) =>
      (fTipo === 'all' || i.tipo === fTipo) &&
      (fPrio === 'all' || i.prioridade === fPrio) &&
      (fEstado === 'all' || i.estado === fEstado)
    );
  }, [issues, fTipo, fPrio, fEstado]);

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }
  if (!projecto) {
    return <p className="text-sm text-muted-foreground">Projecto não encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dev')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{projecto.nome}</h1>
          <Badge variant="outline" className="capitalize">{projecto.estado}</Badge>
          {projecto.versao_actual && <Badge variant="secondary">v{projecto.versao_actual}</Badge>}
        </div>
        {projecto.descricao && <p className="text-sm text-muted-foreground">{projecto.descricao}</p>}
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="projecto">Projecto</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="adrs">ADRs</TabsTrigger>
          <TabsTrigger value="contribuidores">Contribuidores</TabsTrigger>
        </TabsList>

        {/* Projecto */}
        <TabsContent value="projecto" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Informação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Field label="Repositório" value={projecto.repo_url} link />
              <Field label="Documentação" value={projecto.docs_url} link />
              <Field label="Deploy" value={projecto.deploy_url} link />
              <Field label="Versão" value={projecto.versao_actual} />
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Stack</p>
                <div className="flex flex-wrap gap-1">
                  {(projecto.stack ?? []).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  {(!projecto.stack || projecto.stack.length === 0) && <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues */}
        <TabsContent value="issues" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Filter label="Tipo" value={fTipo} setValue={setFTipo} options={['bug','feature','decisao','discussao','outro']} />
            <Filter label="Prioridade" value={fPrio} setValue={setFPrio} options={['critica','alta','media','baixa']} />
            <Filter label="Estado" value={fEstado} setValue={setFEstado} options={['aberto','em_progresso','resolvido','fechado']} />
          </div>
          {issuesFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma issue.</p>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {issuesFiltradas.map((i) => (
                  <div key={i.id} className="p-3 flex items-center gap-3">
                    <Bug className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{i.titulo}</p>
                      {i.descricao && <p className="text-xs text-muted-foreground truncate">{i.descricao}</p>}
                    </div>
                    <Badge variant="outline" className="capitalize">{i.tipo}</Badge>
                    <Badge variant={PRIORIDADE_VARIANT[i.prioridade as IssuePrioridade]} className="capitalize">{i.prioridade}</Badge>
                    <Badge variant="secondary" className="capitalize">{(i.estado as string).replace('_',' ')}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ADRs */}
        <TabsContent value="adrs" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAdrOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo ADR
            </Button>
          </div>
          {!adrs || adrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem decisões registadas.</p>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {adrs.map((a) => (
                  <div key={a.id} className="p-3 flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">ADR-{String(a.numero).padStart(3, '0')}</span>
                    <span className="font-medium flex-1 truncate">{a.titulo}</span>
                    <Badge variant="outline" className="capitalize">{a.estado}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <ADRForm projectoId={projecto.id} open={adrOpen} onOpenChange={setAdrOpen} />
        </TabsContent>

        {/* Contribuidores */}
        <TabsContent value="contribuidores">
          <Card>
            <CardContent className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Gestão de contribuidores em breve.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {value ? (
        link ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
            {value}
          </a>
        ) : <p className="break-all">{value}</p>
      ) : <p className="text-muted-foreground">—</p>}
    </div>
  );
}

function Filter({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[160px] h-9">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: todos</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace('_',' ')}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
