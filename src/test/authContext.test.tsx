import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
const clearPersistedAuthSession = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: authState },
  clearPersistedAuthSession,
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AuthProbe() {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="status">{loading ? 'loading' : user?.email ?? 'anonymous'}</span>
      <button onClick={signOut}>logout</button>
    </div>
  );
}

const session = {
  user: { id: 'admin-id', email: 'brandadministration@gmail.com' },
} as never;

describe('AuthContext logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.getSession.mockResolvedValue({ data: { session }, error: null });
    authState.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('uses local scope and clears the UI session', async () => {
    authState.signOut.mockResolvedValue({ error: null });

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(await screen.findByTestId('status')).toHaveTextContent('brandadministration@gmail.com');

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(authState.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(clearPersistedAuthSession).not.toHaveBeenCalled();
  });

  it('clears persisted storage when the auth API returns an error', async () => {
    authState.signOut.mockResolvedValue({ error: new Error('network') });

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await screen.findByText('brandadministration@gmail.com');
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(clearPersistedAuthSession).toHaveBeenCalledOnce();
  });
});
