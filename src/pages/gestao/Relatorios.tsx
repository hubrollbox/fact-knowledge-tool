import { useState, useEffect, useRef } from 'react';
import { Printer } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatarData, CERTEZA_LABELS, PRIORIDADE_LABELS } from '@/lib/utils-fkt';
import type { Processo, Facto, Issue, Rule, Application, Conclusao } from '@/types';

type RelatorioTipo = 'factos' | 'firac' | 'lacunas';

interface RelatorioData {
  processo: Processo;
  factos: Facto[];
  issues: Issue[];
  rules: Rule[];
  applications: Application[];
  conclusoes: Conclusao[];
}

export default function Relatorios() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState('');
  const [tipo, setTipo] = useState<RelatorioTipo>('firac');
  const [data, setData] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('processos').select('id,titulo,tipo,estado,materia,descricao,created_at').eq('user_id', user.id).neq('estado','arquivado').order('titulo').then(({ data }) => setProcessos((data as Processo[]) || []));
  }, [user]);

  const gerarRelatorio = async () => {
    if (!selectedProcesso) return;
    setLoading(true);
    const [pRes, fRes, iRes, rRes, aRes, cRes] = await Promise.all([
      supabase.from('processos').select('*, cliente:clientes(nome)').eq('id', selectedProcesso).single(),
      supabase.from('factos').select('*').eq('processo_id', selectedProcesso).order('data_facto', { ascending: true }),
      supabase.from('issues').select('*').eq('processo_id', selectedProcesso).order('created_at'),
      supabase.from('rules').select('*').eq('processo_id', selectedProcesso).order('created_at'),
      supabase.from('applications').select('*, issue:issues(descricao), rule:rules(referencia), application_factos(facto:factos(descricao))').eq('processo_id', selectedProcesso),
      supabase.from('conclusoes').select('*').in('issue_id', (await supabase.from('issues').select('id').eq('processo_id', selectedProcesso)).data?.map(i => i.id) || []),
    ]);
    setData({
      processo: pRes.data as Processo,
      factos: (fRes.data as Facto[]) || [],
      issues: (iRes.data as Issue[]) || [],
      rules: (rRes.data as Rule[]) || [],
      applications: (aRes.data as Application[]) || [],
      conclusoes: (cRes.data as Conclusao[]) || [],
    });
    setLoading(false);
  };

  const handlePrint = () => window.print();

  const issuesComLacunas = data?.issues.filter(i => !data.conclusoes.find(c => c.issue_id === i.id)) || [];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerar relatórios de análise FIRAC</p>
          </div>
          {data && (
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />Imprimir
            </Button>
          )}
        </div>

        <Card className="border-border print:hidden">
          <CardContent className="p-5">
            <div className="grid sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Processo</Label>
                <Select value={selectedProcesso} onValueChange={setSelectedProcesso}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar processo..." /></SelectTrigger>
                  <SelectContent>
                    {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={tipo} onValueChange={v => setTipo(v as RelatorioTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="factos">Só Factos</SelectItem>
                    <SelectItem value="firac">FIRAC Completo</SelectItem>
                    <SelectItem value="lacunas">Análise de Lacunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={gerarRelatorio} disabled={!selectedProcesso || loading}>
                {loading ? 'A gerar...' : 'Gerar Relatório'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Relatório */}
        {data && (
          <div ref={printRef} className="print:p-0 space-y-8">
            {/* Cabeçalho */}
            <div className="border-b border-border pb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">FKT — Factual Knowledge Tool</p>
              <h2 className="text-2xl font-bold text-foreground">{data.processo.titulo}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                <span className="capitalize">Tipo: {data.processo.tipo}</span>
                {data.processo.materia && <span>Matéria: {data.processo.materia}</span>}
                <span>Data: {formatarData(new Date().toISOString())}</span>
              </div>
              {tipo === 'factos' && <p className="mt-1 text-sm font-medium">Relatório: Listagem de Factos</p>}
              {tipo === 'firac' && <p className="mt-1 text-sm font-medium">Relatório: Análise FIRAC Completa</p>}
              {tipo === 'lacunas' && <p className="mt-1 text-sm font-medium">Relatório: Análise de Lacunas</p>}
            </div>

            {/* Factos */}
            <section>
              <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">F — Factos</h3>
              {data.factos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum facto registado.</p>
              ) : (
                <div className="space-y-3">
                  {data.factos.map((f, i) => (
                    <div key={f.id} className="flex gap-3">
                      <span className="text-xs text-muted-foreground mt-1 w-5 shrink-0">{i + 1}.</span>
                      <div>
                        <p className="text-sm text-foreground">{f.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.data_facto ? formatarData(f.data_facto) : 'Data desconhecida'} · Certeza: {CERTEZA_LABELS[f.grau_certeza]}
                        </p>
                        {f.observacoes && <p className="text-xs text-muted-foreground italic">{f.observacoes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* FIRAC completo */}
            {(tipo === 'firac' || tipo === 'lacunas') && (
              <>
                <section>
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">I — Issues (Questões)</h3>
                  {data.issues.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma issue.</p> : (
                    <div className="space-y-2">
                      {data.issues.map((i, idx) => (
                        <div key={i.id} className="flex gap-3">
                          <span className="text-xs text-muted-foreground mt-1 w-5 shrink-0">{idx + 1}.</span>
                          <div>
                            <p className="text-sm text-foreground">{i.descricao}</p>
                            <p className="text-xs text-muted-foreground">Prioridade: {PRIORIDADE_LABELS[i.prioridade]} · Estado: {i.estado === 'aberta' ? 'Aberta' : 'Resolvida'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">R — Rules (Normas)</h3>
                  {data.rules.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma norma.</p> : (
                    <div className="space-y-3">
                      {data.rules.map(r => (
                        <div key={r.id}>
                          <code className="text-sm font-mono font-bold">{r.referencia}</code>
                          {r.fonte && <span className="text-xs text-muted-foreground ml-2">({r.fonte})</span>}
                          <p className="text-sm text-muted-foreground mt-1">{r.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">A — Applications (Argumentação)</h3>
                  {data.applications.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma application.</p> : (
                    <div className="space-y-4">
                      {data.applications.map(app => {
                        const issue = app.issue as unknown as { descricao: string };
                        const rule = app.rule as unknown as { referencia: string };
                        return (
                          <div key={app.id} className="border-l-2 border-border pl-4">
                            <p className="text-xs text-muted-foreground">Issue: {issue?.descricao}</p>
                            <p className="text-xs text-muted-foreground">Norma: {rule?.referencia} · {app.tipo === 'pro' ? 'Pró' : 'Contra'}</p>
                            <p className="text-sm text-foreground mt-1">{app.argumento}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">C — Conclusões</h3>
                  {data.conclusoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma conclusão.</p> : (
                    <div className="space-y-4">
                      {data.issues.map(issue => {
                        const conclusao = data.conclusoes.find(c => c.issue_id === issue.id);
                        if (!conclusao) return null;
                        return (
                          <div key={issue.id}>
                            <p className="text-sm font-medium text-muted-foreground">{issue.descricao}</p>
                            <p className="text-sm text-foreground mt-1">{conclusao.resultado}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Confiança: {CERTEZA_LABELS[conclusao.grau_confianca]}</p>
                            {conclusao.pontos_frageis && <p className="text-xs text-muted-foreground italic mt-0.5">⚠️ {conclusao.pontos_frageis}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* Lacunas */}
            {tipo === 'lacunas' && issuesComLacunas.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">⚠️ Lacunas Identificadas</h3>
                <div className="space-y-2">
                  {issuesComLacunas.map(i => (
                    <div key={i.id} className="p-3 border border-border rounded-lg bg-muted">
                      <p className="text-sm text-foreground">{i.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Sem conclusão · {PRIORIDADE_LABELS[i.prioridade]}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Disclaimer */}
            <section className="border-t border-border pt-6 mt-8">
              <div className="p-4 border border-border rounded-lg bg-muted">
                <p className="text-xs font-bold text-foreground mb-1">⚠️ DECLARAÇÃO IMPORTANTE — NÃO CONSTITUI ACONSELHAMENTO JURÍDICO</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Este relatório foi gerado pela ferramenta FKT (Factual Knowledge Tool) exclusivamente para fins de organização e análise de informação factual. 
                  O seu conteúdo não constitui, nem deve ser interpretado como, aconselhamento jurídico, legal ou de qualquer outra natureza profissional. 
                  Para questões de natureza jurídica, consulte sempre um advogado ou solicitador devidamente habilitado. 
                  A FKT não assume qualquer responsabilidade pelo uso ou interpretação deste documento.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
