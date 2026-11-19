export interface PilotAccessRequestInput {
  name: string;
  email: string;
  roleCompany: string;
  worksCount: number;
  privacyConsent: boolean;
}

export function validatePilotAccessRequest(input: PilotAccessRequestInput): string | null {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const roleCompany = input.roleCompany.trim();

  if (name.length < 2 || name.length > 120) return 'Indica um nome entre 2 e 120 caracteres.';
  if (
    email.length > 254 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
  ) return 'Indica um endereço de email válido.';
  if (roleCompany.length < 2 || roleCompany.length > 180) return 'Indica a função ou empresa (2 a 180 caracteres).';
  if (!Number.isInteger(input.worksCount) || input.worksCount < 0 || input.worksCount > 100000) {
    return 'Indica um número válido de obras acompanhadas.';
  }
  if (!input.privacyConsent) return 'É necessário aceitar o tratamento dos dados para responder ao pedido.';

  return null;
}
