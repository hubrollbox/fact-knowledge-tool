export function formatDiaryAuthor(authorId?: string | null, authorName?: string | null): string {
  const name = authorName?.trim();
  if (name) return name;
  return authorId
    ? 'Nome não disponível na conta'
    : 'Autor não identificado nos dados disponíveis';
}
