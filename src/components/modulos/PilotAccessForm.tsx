import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { validatePilotAccessRequest } from '@/lib/pilotAccessValidation';
import { Button } from '@/components/ui/button';

export function PilotAccessForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormError('');
    setSubmitting(true);

    const form = new FormData(formElement);
    const request = {
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim().toLowerCase(),
      roleCompany: String(form.get('role_company') ?? '').trim(),
      worksCount: Number(form.get('works_count')),
      privacyConsent: form.get('privacy_consent') === 'on',
    };
    const validationError = validatePilotAccessRequest(request);
    if (validationError) {
      setFormError(validationError);
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('pilot_access_requests').insert({
        name: request.name,
        email: request.email,
        role_company: request.roleCompany,
        works_count: request.worksCount,
        privacy_consent: request.privacyConsent,
        privacy_consent_at: new Date().toISOString(),
      });
      if (error) {
        setFormError('Não foi possível enviar o pedido. Verifica os dados e tenta novamente.');
        return;
      }
      setSubmitted(true);
      formElement.reset();
    } catch {
      setFormError('Não foi possível enviar o pedido. Verifica a ligação à internet e tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2" role="status">
        <h3 className="font-semibold">Pedido recebido</h3>
        <p className="text-sm text-muted-foreground">Obrigado pelo interesse. Os dados foram registados para análise e eventual contacto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="space-y-1">
        <label htmlFor="pilot-name" className="text-sm font-medium">Nome</label>
        <input id="pilot-name" name="name" required minLength={2} maxLength={120} autoComplete="name" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="pilot-email" className="text-sm font-medium">Email</label>
        <input id="pilot-email" name="email" type="email" required maxLength={254} autoComplete="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label htmlFor="pilot-role" className="text-sm font-medium">Função / Empresa</label>
        <input id="pilot-role" name="role_company" required minLength={2} maxLength={180} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ex.: Fiscal de obra independente" />
      </div>
      <div className="space-y-1">
        <label htmlFor="pilot-works" className="text-sm font-medium">Quantas obras acompanha habitualmente?</label>
        <select id="pilot-works" name="works_count" required defaultValue="" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="" disabled>Selecciona uma opção</option>
          <option value="0">Ainda não acompanho obras</option>
          <option value="1">1</option>
          <option value="3">2 a 3</option>
          <option value="5">4 a 5</option>
          <option value="10">6 a 10</option>
          <option value="11">Mais de 10</option>
        </select>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="privacy_consent" required className="mt-0.5" />
        <span>Autorizo o tratamento destes dados para análise do pedido e eventual contacto sobre o piloto. Consulte a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.</span>
      </label>
      {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? 'A enviar…' : 'Enviar pedido'}</Button>
      <p className="text-xs text-muted-foreground">O envio do pedido não garante acesso ao piloto nem cria uma conta.</p>
    </form>
  );
}
