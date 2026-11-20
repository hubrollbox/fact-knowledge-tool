import { describe, expect, it } from 'vitest';
import { validatePilotAccessRequest, type PilotAccessRequestInput } from '@/lib/pilotAccessValidation';

const validRequest: PilotAccessRequestInput = {
  name: 'Ana Silva',
  email: 'ana@example.pt',
  roleCompany: 'Fiscal de obra',
  worksCount: 3,
  privacyConsent: true,
};

describe('validatePilotAccessRequest', () => {
  it('accepts a valid request', () => {
    expect(validatePilotAccessRequest(validRequest)).toBeNull();
  });

  it('rejects an invalid email address', () => {
    expect(validatePilotAccessRequest({ ...validRequest, email: 'ana@' })).toBe(
      'Indica um endereço de email válido.',
    );
  });

  it('rejects a name that is too short', () => {
    expect(validatePilotAccessRequest({ ...validRequest, name: 'A' })).toBe(
      'Indica um nome entre 2 e 120 caracteres.',
    );
  });

  it('rejects a negative or non-integer works count', () => {
    expect(validatePilotAccessRequest({ ...validRequest, worksCount: -1 })).toBe(
      'Indica um número válido de obras acompanhadas.',
    );
    expect(validatePilotAccessRequest({ ...validRequest, worksCount: 1.5 })).toBe(
      'Indica um número válido de obras acompanhadas.',
    );
  });

  it('requires explicit privacy consent', () => {
    expect(validatePilotAccessRequest({ ...validRequest, privacyConsent: false })).toBe(
      'É necessário aceitar o tratamento dos dados para responder ao pedido.',
    );
  });
});
