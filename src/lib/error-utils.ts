/**
 * Sanitizes database/API errors before displaying to users.
 * Logs the full error for debugging while returning a safe message.
 */
export function formatDatabaseError(error: unknown): string {
  if (error && typeof error === 'object') {
    console.error('Database error:', error);
    const err = error as { code?: string; message?: string };
    const code = err.code;
    if (code === '23505') return 'Este registo já existe.';
    if (code === '23503') return 'Não é possível eliminar — item está em uso.';
    if (code === '23502') return 'Campo obrigatório em falta.';
    if (code === 'PGRST116') return 'Registo não encontrado.';
    if (code === '42501') return 'Sem permissão para esta operação.';
  }
  return 'Ocorreu um erro ao processar o pedido. Por favor, tente novamente.';
}
