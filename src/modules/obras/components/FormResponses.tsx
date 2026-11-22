import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useObrasWorkspace } from '../hooks/useObrasWorkspace';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ClipboardList, Loader2, Plus, Save } from 'lucide-react';
import type { FormDefinition, FormField } from '../hooks/useFormTemplates';

const db = supabase as any;
type FormResponse = {
  id: string;
  formulario_id: string;
  visita_id: string;
  ocorrencia_id: string | null;
  definicao_snapshot: FormDefinition;
  respostas: Record<string, unknown>;
  estado: 'rascunho' | 'concluido';
  created_at: string;
};
type Template = { id: string; nome: string; descricao: string | null; tipo: string };
type AttachmentOption = { id: string; label: string };

export function FormResponses({ obraId, visitaId, canWrite }: { obraId: string; visitaId: string; canWrite: boolean }) {
  const workspaceId = useObrasWorkspace();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});

  const templatesQuery = useQuery({
    queryKey: ['obras-formularios-activos', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await db.from('obras_formularios')
        .select('id,nome,descricao,tipo').eq('workspace_id', workspaceId).eq('estado', 'activo').order('nome');
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });
  const responsesQuery = useQuery({
    queryKey: ['obras-formularios-respostas', visitaId],
    enabled: !!visitaId,
    queryFn: async () => {
      const { data, error } = await db.from('obras_formularios_respostas').select('*')
        .eq('visita_id', visitaId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FormResponse[];
    },
  });
  const photosQuery = useQuery({
    queryKey: ['obras-formularios-fotos', visitaId],
    enabled: !!visitaId,
    queryFn: async () => {
      const { data, error } = await db.from('obras_fotos').select('id,legenda,capturada_em')
        .eq('visita_id', visitaId).order('capturada_em', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((photo: any) => ({ id: photo.id, label: photo.legenda || new Date(photo.capturada_em).toLocaleString('pt-PT') })) as AttachmentOption[];
    },
  });
  const documentsQuery = useQuery({
    queryKey: ['obras-formularios-documentos', obraId, visitaId],
    enabled: !!obraId && !!visitaId,
    queryFn: async () => {
      const { data: links, error: linksError } = await db.from('obras_documentos_ligacoes')
        .select('documento_id').eq('obra_id', obraId).eq('visita_id', visitaId);
      if (linksError) throw linksError;
      const ids = [...new Set((links ?? []).map((link: any) => link.documento_id))];
      if (!ids.length) return [] as AttachmentOption[];
      const { data, error } = await db.from('obras_documentos').select('id,titulo').in('id', ids);
      if (error) throw error;
      return (data ?? []).map((doc: any) => ({ id: doc.id, label: doc.titulo })) as AttachmentOption[];
    },
  });

  useEffect(() => {
    if (responsesQuery.data) {
      setDrafts((current) => {
        const next = { ...current };
        responsesQuery.data!.forEach((response) => {
          if (!(response.id in next)) next[response.id] = response.respostas ?? {};
        });
        return next;
      });
    }
  }, [responsesQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['obras-formularios-respostas', visitaId] });
  };
  const createResponse = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await db.rpc('criar_obras_formulario_resposta', {
        p_formulario_id: templateId, p_obra_id: obraId, p_visita_id: visitaId, p_ocorrencia_id: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Formulário iniciado' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível iniciar', description: error.message, variant: 'destructive' }),
  });
  const saveResponse = useMutation({
    mutationFn: async ({ id, respostas }: { id: string; respostas: Record<string, unknown> }) => {
      const { error } = await db.from('obras_formularios_respostas').update({ respostas }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast({ title: 'Não foi possível guardar as respostas', description: error.message, variant: 'destructive' }),
  });
  const completeResponse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc('concluir_obras_formulario_resposta', { p_resposta_id: id });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Formulário concluído' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível concluir', description: error.message, variant: 'destructive' }),
  });

  const setValue = (responseId: string, fieldId: string, value: unknown) => {
    setDrafts((current) => ({ ...current, [responseId]: { ...(current[responseId] ?? {}), [fieldId]: value } }));
  };
  const optionsFor = (type: FormField['type']) => type === 'photo' ? photosQuery.data ?? [] : documentsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />Formulários e listas de verificação</CardTitle>
        {canWrite && !!templatesQuery.data?.length && (
          <Select onValueChange={(templateId) => createResponse.mutate(templateId)} disabled={createResponse.isPending}>
            <SelectTrigger className="w-auto min-w-[170px]"><SelectValue placeholder="Iniciar formulário" /></SelectTrigger>
            <SelectContent>{templatesQuery.data.map((template) => <SelectItem key={template.id} value={template.id}>{template.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {templatesQuery.isLoading || responsesQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        {templatesQuery.isError || responsesQuery.isError ? <p className="text-sm text-destructive">Não foi possível carregar os formulários desta visita.</p> : null}
        {!templatesQuery.isLoading && !templatesQuery.data?.length && !responsesQuery.data?.length && <p className="text-sm text-muted-foreground">Não existem modelos activos disponíveis para esta visita.</p>}
        {responsesQuery.data?.map((response) => {
          const values = drafts[response.id] ?? response.respostas ?? {};
          const locked = response.estado === 'concluido' || !canWrite;
          return (
            <div key={response.id} className="rounded-lg border p-3 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-medium text-sm">Formulário</p><p className="text-xs text-muted-foreground">Criado em {new Date(response.created_at).toLocaleString('pt-PT')}</p></div>
                <Badge variant={response.estado === 'concluido' ? 'default' : 'outline'}>{response.estado}</Badge>
              </div>
              {response.definicao_snapshot.sections.map((section) => (
                <section key={section.id} className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">{section.title}</h3>
                  {section.fields.map((field) => {
                    const value = values[field.id];
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <Label>{field.label}{field.required ? ' *' : ''}</Label>
                        {field.type === 'text' && <Textarea value={typeof value === 'string' ? value : ''} onChange={(e) => setValue(response.id, field.id, e.target.value)} disabled={locked} rows={2} />}
                        {field.type === 'number' && <Input type="number" value={typeof value === 'number' ? value : ''} onChange={(e) => setValue(response.id, field.id, e.target.value === '' ? null : Number(e.target.value))} disabled={locked} />}
                        {field.type === 'date' && <Input type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => setValue(response.id, field.id, e.target.value)} disabled={locked} />}
                        {field.type === 'choice' && <Select value={typeof value === 'string' ? value : ''} onValueChange={(v) => setValue(response.id, field.id, v)} disabled={locked}><SelectTrigger><SelectValue placeholder="Seleccione uma opção" /></SelectTrigger><SelectContent>{(field.options ?? []).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>}
                        {field.type === 'boolean' && <label className="flex items-center gap-2 text-sm"><Checkbox checked={value === true} onCheckedChange={(checked) => setValue(response.id, field.id, checked === true)} disabled={locked} />Confirmado</label>}
                        {(field.type === 'attachment' || field.type === 'photo') && <div className="space-y-2">
                          {optionsFor(field.type).map((option) => {
                            const selected = Array.isArray(value) ? value as string[] : [];
                            return <label key={option.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(option.id)} disabled={locked} onCheckedChange={(checked) => setValue(response.id, field.id, checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} />{option.label}</label>;
                          })}
                          {!optionsFor(field.type).length && <p className="text-xs text-muted-foreground">Não existem {field.type === 'photo' ? 'fotografias' : 'documentos'} associados a esta visita.</p>}
                        </div>}
                      </div>
                    );
                  })}
                </section>
              ))}
              {canWrite && response.estado === 'rascunho' && <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => saveResponse.mutate({ id: response.id, respostas: values })} disabled={saveResponse.isPending}><Save className="mr-1 h-4 w-4" />Guardar respostas</Button>
                <Button size="sm" onClick={() => completeResponse.mutate(response.id)} disabled={completeResponse.isPending}><CheckCircle2 className="mr-1 h-4 w-4" />Validar e concluir</Button>
              </div>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
