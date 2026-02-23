import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, ExternalLink, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { formatarData } from '@/lib/utils-fkt';
import { useAuth } from '@/contexts/AuthContext';
import type { Documento } from '@/types';

interface Props { processoId: string; }

const emptyForm = { titulo: '', tipo: '', data_documento: '', entidade_origem: '', localizacao: '', descricao: '' };

export function DocumentosTab({ processoId }: Props) {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('processo_id', processoId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(`Não foi possível sincronizar documentos com o Supabase: ${error.message}`);
      setDocumentos([]);
      setLoading(false);
      return;
    }

    setError(null);
    setDocumentos((data as Documento[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [processoId]);

  const handleSave = async () => {
    if (!form.titulo.trim() || !user) return;
    setError(null);
    setSaving(true);

    let storagePath: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${processoId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('documentos').upload(path, file);
      if (error) {
        setError(`Erro no upload do ficheiro: ${error.message}`);
        setSaving(false);
        return;
      }
      storagePath = path;
    }

    const { error: insertError } = await supabase.from('documentos').insert({
      processo_id: processoId,
      titulo: form.titulo.trim(),
      tipo: form.tipo.trim() || null,
      data_documento: form.data_documento || null,
      entidade_origem: form.entidade_origem.trim() || null,
      localizacao: form.localizacao.trim() || null,
      descricao: form.descricao.trim() || null,
      storage_path: storagePath,
    });

    if (insertError) {
      setError(`Erro ao guardar documento: ${insertError.message}`);
      setSaving(false);
      return;
    }

    await fetch();
    setSaving(false);
    setDialogOpen(false);
    setForm(emptyForm);
    setFile(null);
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm('Eliminar este documento?')) return;
    if (doc.storage_path) {
      const { error } = await supabase.storage.from('documentos').remove([doc.storage_path]);
      if (error) {
        setError(`Erro ao remover ficheiro do storage: ${error.message}`);
        return;
      }
    }

    const { error } = await supabase.from('documentos').delete().eq('id', doc.id);
    if (error) {
      setError(`Erro ao eliminar documento: ${error.message}`);
      return;
    }

    setDocumentos(prev => prev.filter(d => d.id !== doc.id));
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('documentos').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{documentos.length} documento{documentos.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => { setForm(emptyForm); setFile(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo Documento
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Nenhum documento anexado</p>
          <Button size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>Adicionar documento</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map(doc => (
            <div key={doc.id} className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card group hover:border-foreground/20 transition-colors">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{doc.titulo}</p>
                  {doc.tipo && <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{doc.tipo}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                  {doc.data_documento && <span>{formatarData(doc.data_documento)}</span>}
                  {doc.entidade_origem && <span>· {doc.entidade_origem}</span>}
                </div>
                {doc.descricao && <p className="text-xs text-muted-foreground mt-1">{doc.descricao}</p>}
                {doc.storage_path && (
                  <a href={getPublicUrl(doc.storage_path)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-foreground underline mt-1">
                    <ExternalLink className="h-3 w-3" />Ver ficheiro
                  </a>
                )}
                {doc.localizacao && !doc.storage_path && (
                  <a href={doc.localizacao} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-foreground underline mt-1">
                    <ExternalLink className="h-3 w-3" />{doc.localizacao}
                  </a>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 shrink-0" onClick={() => handleDelete(doc)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Documento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Contrato de Arrendamento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ex: PDF, Imagem..." />
              </div>
              <div className="space-y-2">
                <Label>Data do Documento</Label>
                <Input type="date" value={form.data_documento} onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Entidade de Origem</Label>
              <Input value={form.entidade_origem} onChange={e => setForm(f => ({ ...f, entidade_origem: e.target.value }))} placeholder="Ex: Tribunal, Notário..." />
            </div>
            <div className="space-y-2">
              <Label>Upload de Ficheiro</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <input type="file" id="file-upload" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                <label htmlFor="file-upload" className="text-sm text-foreground cursor-pointer hover:underline">
                  {file ? file.name : 'Clique para seleccionar ficheiro'}
                </label>
                <p className="text-xs text-muted-foreground mt-1">PDF, imagens, documentos Word</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL / Localização</Label>
              <Input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do documento..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
