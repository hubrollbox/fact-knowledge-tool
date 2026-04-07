import { useProcesso, useUpdateProcesso } from '../hooks/useProcessos';
import { usePrazos } from '../hooks/usePrazos';
import { useDocumentos } from '../hooks/useDocumentos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Calendar, FileText, Users, Scale } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';

const tipos = ['cível', 'penal', 'administrativo', 'laboral', 'outro'];
const estados = ['activo', 'suspenso', 'concluido', 'arquivado'];
const estadoCores: Record<string, string> = {
  activo: 'bg-green-600 text-white',
  suspenso: 'bg-yellow-500 text-white',
  concluido: 'bg-muted text-muted-foreground',
  arquivado: 'bg-secondary text-secondary-foreground',
};
const prazoCores: Record<string, string> = {
  pendente: 'bg-yellow-500 text-white',
  cumprido: 'bg-green-600 text-white',
  perdido: 'bg-destructive text-destructive-foreground',
};

interface Props {
  processoId: string;
  onBack?: () => void;
}

export function ProcessoDetail({ processoId, onBack }: Props) {
  const { data: processo, isLoading } = useProcesso(processoId);
  const { data: prazos } = usePrazos(processoId);
  const { data: documentos } = useDocumentos(processoId);
  const update = useUpdateProcesso();

  if (isLoading || !processo) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{processo.titulo}</h1>
            <Badge className={estadoCores[processo.estado] ?? ''}>{processo.estado}</Badge>
          </div>
          {processo.numero_processo && (
            <p className="text-sm text-muted-foreground">Proc. {processo.numero_processo}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumo"><Scale className="mr-1.5 h-3.5 w-3.5" />Resumo</TabsTrigger>
          <TabsTrigger value="analise"><FileText className="mr-1.5 h-3.5 w-3.5" />Análise</TabsTrigger>
          <TabsTrigger value="partes"><Users className="mr-1.5 h-3.5 w-3.5" />Partes</TabsTrigger>
          <TabsTrigger value="documentos"><FileText className="mr-1.5 h-3.5 w-3.5" />Documentos</TabsTrigger>
          <TabsTrigger value="prazos"><Calendar className="mr-1.5 h-3.5 w-3.5" />Prazos</TabsTrigger>
        </TabsList>

        {/* Tab Resumo */}
        <TabsContent value="resumo">
          <ResumoTab processo={processo} onUpdate={update} />
        </TabsContent>

        {/* Tab Análise */}
        <TabsContent value="analise">
          <AnaliseTab processo={processo} onUpdate={update} />
        </TabsContent>

        {/* Tab Partes */}
        <TabsContent value="partes">
          <PartesTab processoId={processoId} />
        </TabsContent>

        {/* Tab Documentos */}
        <TabsContent value="documentos">
          <DocumentosTab documentos={documentos ?? []} processoId={processoId} />
        </TabsContent>

        {/* Tab Prazos */}
        <TabsContent value="prazos">
          <PrazosTab prazos={prazos ?? []} processoId={processoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Sub-components ─── */

function ResumoTab({ processo, onUpdate }: { processo: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    referencia: processo.referencia ?? '',
    numero_processo: processo.numero_processo ?? '',
    tipo: processo.tipo ?? 'cível',
    tribunal: processo.tribunal ?? '',
    estado: processo.estado,
  });

  const save = async () => {
    try {
      await onUpdate.mutateAsync({ id: processo.id, ...form });
      toast.success('Processo actualizado');
      setEditing(false);
    } catch {
      toast.error('Erro ao actualizar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Dados do Processo</CardTitle>
        <Button variant="outline" size="sm" onClick={() => editing ? save() : setEditing(true)}>
          {editing ? 'Guardar' : 'Editar'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Referência interna</Label>
            {editing ? (
              <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
            ) : (
              <p className="text-sm">{processo.referencia || '—'}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Número do processo</Label>
            {editing ? (
              <Input value={form.numero_processo} onChange={(e) => setForm({ ...form, numero_processo: e.target.value })} />
            ) : (
              <p className="text-sm">{processo.numero_processo || '—'}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            {editing ? (
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">{processo.tipo || '—'}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Tribunal</Label>
            {editing ? (
              <Input value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} />
            ) : (
              <p className="text-sm">{processo.tribunal || '—'}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            {editing ? (
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estados.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={estadoCores[processo.estado] ?? ''}>{processo.estado}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnaliseTab({ processo, onUpdate }: { processo: any; onUpdate: any }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    contexto: processo.contexto ?? '',
    questao: processo.questao ?? '',
    referencias: processo.referencias ?? '',
    analise: processo.analise ?? '',
    conclusao: processo.conclusao ?? '',
  });

  const fields = [
    { key: 'contexto', label: 'Contexto' },
    { key: 'questao', label: 'Questão' },
    { key: 'referencias', label: 'Referências' },
    { key: 'analise', label: 'Análise' },
    { key: 'conclusao', label: 'Conclusão' },
  ] as const;

  const save = async () => {
    try {
      await onUpdate.mutateAsync({ id: processo.id, ...form });
      toast.success('Análise actualizada');
      setEditing(false);
    } catch {
      toast.error('Erro ao actualizar');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Análise Jurídica</CardTitle>
        <Button variant="outline" size="sm" onClick={() => editing ? save() : setEditing(true)}>
          {editing ? 'Guardar' : 'Editar'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            {editing ? (
              <Textarea
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={4}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm">{(processo as any)[key] || '—'}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PartesTab({ processoId }: { processoId: string }) {
  // Placeholder — hook usePartes a criar
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Partes</CardTitle>
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar</Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Nenhuma parte registada.</p>
      </CardContent>
    </Card>
  );
}

function DocumentosTab({ documentos, processoId }: { documentos: any[]; processoId: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Documentos</CardTitle>
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Upload</Button>
      </CardHeader>
      <CardContent>
        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento.</p>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{doc.nome}</p>
                  {doc.categoria && <p className="text-xs text-muted-foreground capitalize">{doc.categoria}</p>}
                </div>
                {doc.data_documento && (
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(doc.data_documento), "d MMM yyyy", { locale: pt })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrazosTab({ prazos, processoId }: { prazos: any[]; processoId: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Prazos</CardTitle>
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar</Button>
      </CardHeader>
      <CardContent>
        {prazos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum prazo definido.</p>
        ) : (
          <div className="space-y-2">
            {prazos.map((prazo) => (
              <div key={prazo.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{prazo.descricao}</p>
                  {prazo.notas && <p className="text-xs text-muted-foreground">{prazo.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(prazo.data_limite), "d MMM yyyy", { locale: pt })}
                  </span>
                  <Badge className={prazoCores[prazo.estado] ?? ''}>{prazo.estado}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
