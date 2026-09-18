import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const AuthProbe = () => {
  const { user, token, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.name ?? 'anonymous'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('person@example.com', 'password123')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { user: null } });
  });

  it('starts unauthenticated without a stored token', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('hydrates a stored token by fetching the current profile', async () => {
    localStorage.setItem('standup_token', 'saved-jwt');
    vi.mocked(api.get).mockResolvedValue({ data: { user: { name: 'Saved User', role: 'TEAM_MEMBER' } } });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Saved User'));
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('token')).toHaveTextContent('saved-jwt');
  });

  it('stores credentials and user after successful login', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: 'new-jwt', user: { name: 'Logged In User', role: 'TEAM_MEMBER' } },
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Logged In User'));
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'person@example.com',
      password: 'password123',
      companyId: undefined,
    });
    expect(localStorage.getItem('standup_token')).toBe('new-jwt');
  });

  it('clears credentials on logout', async () => {
    localStorage.setItem('standup_token', 'saved-jwt');
    vi.mocked(api.get).mockResolvedValue({ data: { user: { name: 'Saved User', role: 'TEAM_MEMBER' } } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );
    await screen.findByText('Saved User');

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(localStorage.getItem('standup_token')).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });
});
