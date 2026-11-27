import { describe, expect, it } from 'vitest';
import { formatDiaryAuthor } from './formatDiaryAuthor';

describe('formatDiaryAuthor', () => {
  it('shows the immutable display-name snapshot when available', () => {
    expect(formatDiaryAuthor('user-1', '  Ana Silva  ')).toBe('Ana Silva');
  });

  it('does not expose internal identifiers when the account has no display name', () => {
    expect(formatDiaryAuthor('user-1', null)).toBe('Nome não disponível na conta');
  });

  it('marks legacy records without an author', () => {
    expect(formatDiaryAuthor(null, null)).toBe('Autor não identificado nos dados disponíveis');
  });
});
