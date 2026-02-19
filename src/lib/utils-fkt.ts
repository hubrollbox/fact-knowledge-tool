// Palavras conclusivas proibidas em factos
export const PALAVRAS_CONCLUSIVAS = [
  'erro', 'culpa', 'culpado', 'culpada', 'conforme', 'inconformidade',
  'ilegal', 'ilícito', 'ilícita', 'responsável', 'responsabilidade',
  'violação', 'violou', 'incumpriu', 'incumprimento', 'negligência',
  'negligente', 'dolo', 'doloso', 'fraudulento', 'fraude', 'abuso',
  'ilegítimo', 'ilegítima', 'inválido', 'inválida', 'nulo', 'nula',
  'prejudicial', 'dano', 'lesou', 'prejudicou', 'infringiu', 'infração'
];

export function validarFacto(descricao: string): string | null {
  const lower = descricao.toLowerCase();
  for (const palavra of PALAVRAS_CONCLUSIVAS) {
    if (lower.includes(palavra)) {
      return `A descrição do facto contém o termo conclusivo "${palavra}". Os factos devem ser neutros e objectivos.`;
    }
  }
  return null;
}

export function exportarCSV(dados: Record<string, unknown>[], nomeArquivo: string) {
  if (!dados.length) return;
  const headers = Object.keys(dados[0]);
  const csvContent = [
    headers.join(','),
    ...dados.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatarData(data: string | null): string {
  if (!data) return '—';
  try {
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return data;
  }
}

export const ESTADO_LABELS: Record<string, string> = {
  em_analise: 'Em Análise',
  em_progresso: 'Em Progresso',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

export const CERTEZA_LABELS: Record<string, string> = {
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
  desconhecido: 'Desconhecido',
};

export const PRIORIDADE_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
