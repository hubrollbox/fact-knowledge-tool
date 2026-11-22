import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Archive, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import {
  emptyDefinition, useArchiveFormTemplate, useFormTemplate, useFormTemplates,
  usePublishFormTemplate, useSaveFormTemplate,
  type FormDefinition, type FormField, type FormFieldType, type FormSection,
} from '../hooks/useFormTemplates';

const fieldTypes: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' }, { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' }, { value: 'choice', label: 'Escolha' },
  { value: 'boolean', label: 'Confirmação' }, { value: 'attachment', label: 'Anexo' },
  { value: 'photo', label: 'Fotografia' },
];

export function FormTemplatesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite, isLoading: roleLoading } = useWorkspaceRole();
  const { data: selected, isLoading: selectedLoading } = useFormTemplate(id);
  const save = useSaveFormTemplate();
  const publish = usePublishFormTemplate();
  const archive = useArchiveFormTemplate();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('visita');
  const [definition, setDefinition] = useState<FormDefinition>(emptyDefinition);

  useEffect(() => {
    if (!id) {
      setNome(''); setDescricao(''); setTipo('visita'); setDefinition(emptyDefinition);
      return;
    }
    if (selected) {
      setNome(selected.nome); setDescricao(selected.descricao ?? ''); setTipo(selected.tipo);
      setDefinition(selected.draft_definicao ?? emptyDefinition);
    }
  }, [id, selected]);

  const isEditable = !id || selected?.estado !== 'arquivado';
  const canEdit = canWrite && isEditable;
  const updateSection = (sectionId: string, patch: Partial<FormSection>) =>
    setDefinition((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, ...patch } : section) }));
  const addSection = () => setDefinition((current) => ({ ...current, sections: [...current.sections, { id: crypto.randomUUID(), title: 'Nova secção', fields: [] }] }));
  const removeSection = (sectionId: string) => setDefinition((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId) }));
  const addField = (sectionId: string) => updateSection(sectionId, { fields: [...(definition.sections.find((s) => s.id === sectionId)?.fields ?? []), { id: crypto.randomUUID(), label: 'Novo campo', type: 'text', required: false }] });
  const updateField = (sectionId: string, fieldId: string, patch: Partial<FormField>) => {
    const section = definition.sections.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection(sectionId, { fields: section.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field) });
  };
  const removeField = (sectionId: string, fieldId: string) => {
    const section = definition.sections.find((s) => s.id === sectionId);
    if (section) updateSection(sectionId, { fields: section.fields.filter((field) => field.id !== fieldId) });
  };
  const isValid = useMemo(() => nome.trim().length >= 2 && definition.sections.length > 0 &&
    definition.sections.every((section) => section.title.trim() && section.fields.every((field) => field.label.trim() &&
      (field.type !== 'choice' || (field.options?.length ?? 0) > 0))), [nome, definition]);

  const handleSave = async () => {
    const result = await save.mutateAsync({ id, nome: nome.trim(), descricao, tipo, definicao: definition });
    if (!id) navigate('/obras/formularios/' + result, { replace: true });
  };
  const handlePublish = async () => {
    let templateId = id;
    if (!templateId) templateId = await save.mutateAsync({ nome: nome.trim(), descricao, tipo, definicao: definition });
    else await save.mutateAsync({ id: templateId, nome: nome.trim(), descricao, tipo, definicao: definition });
    await publish.mutateAsync(templateId);
    navigate('/obras/formularios', { replace: true });
  };

  if (roleLoading || (id && !selected && selectedLoading)) return <p className="text-sm text-muted-foreground">A carregar...</p>;
  if (id && !selected) return <p className="text-sm text-destructive">Modelo não encontrado ou sem permissões de consulta.</p>;

  if (!id) return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild><Link to="/obras/formularios"><ArrowLeft className="mr-1 h-4 w-4" />Modelos de formulários</Link></Button>
      <header><h1 className="text-2xl font-bold">Novo modelo</h1><p className="text-sm text-muted-foreground">Defina as secções e os campos reutilizáveis.</p></header>
      {editorContent()}
    </div>
  );

  function editorContent() {
    return (
      <>
        <Card><CardContent className="space-y-4 pt-6">
          <div className="space-y-2"><Label>Nome do modelo</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!canEdit} maxLength={160} /></div>
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Tipo</Label><Select value={tipo} onValueChange={setTipo} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visita">Visita</SelectItem><SelectItem value="inspeccao">Inspecção</SelectItem><SelectItem value="verificacao">Verificação</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Estrutura do formulário</h2>{canEdit && <Button size="sm" variant="outline" onClick={addSection}><Plus className="mr-1 h-4 w-4" />Secção</Button>}</div>
          {definition.sections.map((section, sectionIndex) => (
            <Card key={section.id}><CardHeader className="pb-3"><div className="flex items-center gap-2"><CardTitle className="text-base flex-1">Secção {sectionIndex + 1}</CardTitle>{canEdit && <Button size="icon" variant="ghost" onClick={() => removeSection(section.id)} disabled={definition.sections.length === 1}><Trash2 className="h-4 w-4" /></Button>}</div><Input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} disabled={!canEdit} /></CardHeader>
              <CardContent className="space-y-3">
                {section.fields.map((field) => (
                  <div key={field.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center gap-2"><Input value={field.label} onChange={(e) => updateField(section.id, field.id, { label: e.target.value })} disabled={!canEdit} placeholder="Nome do campo" /><Button size="icon" variant="ghost" onClick={() => removeField(section.id, field.id)} disabled={!canEdit}><Trash2 className="h-4 w-4" /></Button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={field.type} onValueChange={(value) => updateField(section.id, field.id, { type: value as FormFieldType, options: value === 'choice' ? (field.options?.length ? field.options : ['Opção 1']) : undefined })} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fieldTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={field.required} onCheckedChange={(checked) => updateField(section.id, field.id, { required: checked === true })} disabled={!canEdit} />Campo obrigatório</label>
                    </div>
                    {field.type === 'choice' && <div className="space-y-2"><Label>Opções (uma por linha)</Label><Textarea value={(field.options ?? []).join('\n')} onChange={(e) => updateField(section.id, field.id, { options: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })} disabled={!canEdit} /></div>}
                  </div>
                ))}
                {canEdit && <Button size="sm" variant="outline" onClick={() => addField(section.id)}><Plus className="mr-1 h-4 w-4" />Campo</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && <Button onClick={handleSave} disabled={!isValid || save.isPending}><Save className="mr-2 h-4 w-4" />Guardar rascunho</Button>}
          {canEdit && <Button variant="secondary" onClick={handlePublish} disabled={!isValid || save.isPending || publish.isPending}><Send className="mr-2 h-4 w-4" />Publicar versão</Button>}
          {id && selected?.estado !== 'arquivado' && canWrite && <Button variant="outline" onClick={() => archive.mutate(id)} disabled={archive.isPending}><Archive className="mr-2 h-4 w-4" />Arquivar</Button>}
          {selected?.estado === 'activo' && <Badge>Versão publicada — {selected.current_version_id ? 'activa' : 'sem versão'}</Badge>}
        </div>
      </>
    );
  }

  if (id) return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild><Link to="/obras/formularios"><ArrowLeft className="mr-1 h-4 w-4" />Modelos de formulários</Link></Button>
      <header><h1 className="text-2xl font-bold">{selected?.nome}</h1><p className="text-sm text-muted-foreground">Gestão do modelo e das suas versões.</p></header>
      {editorContent()}
    </div>
  );

  return null;
}

export function FormTemplatesListPage() {
  const { canWrite } = useWorkspaceRole();
  const { data, isLoading, isError } = useFormTemplates();
  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">Modelos de formulários</h1><p className="text-sm text-muted-foreground">Modelos reutilizáveis para visitas, inspecções e verificações.</p></div>{canWrite && <Button asChild size="sm"><Link to="/obras/formularios/novo"><Plus className="mr-1 h-4 w-4" />Novo modelo</Link></Button>}</header>
      {isLoading ? <p className="text-sm text-muted-foreground">A carregar modelos...</p> : isError ? <p className="text-sm text-destructive">Não foi possível carregar os modelos.</p> : !data?.length ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Ainda não existem modelos de formulários.</CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{data.map((item) => <Link key={item.id} to={'/obras/formularios/' + item.id}><Card className="h-full hover:border-primary/50"><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">{item.nome}</CardTitle><Badge variant={item.estado === 'activo' ? 'default' : 'outline'}>{item.estado}</Badge></div></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><p>{item.descricao || 'Sem descrição.'}</p><p>Tipo: {item.tipo} · Actualizado em {new Date(item.updated_at).toLocaleDateString('pt-PT')}</p></CardContent></Card></Link>)}</div>}
    </div>
  );
}
