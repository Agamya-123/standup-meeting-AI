import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the identifier lookup step', () => {
    renderLogin();

    expect(screen.getByText('Sign in to your workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address or Employee ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('requires an identifier before submitting the lookup form', () => {
    renderLogin();

    const identifier = screen.getByLabelText('Email Address or Employee ID');
    expect(identifier).toBeRequired();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('advances to password verification after a successful identifier lookup', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        multiple: false,
        user: { id: 'user-1', name: 'Taylor', email: 'taylor@example.com', role: 'TEAM_MEMBER' },
        company: { id: 'company-1', name: 'Acme', slug: 'acme' },
      },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address or Employee ID'), 'taylor@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Taylor')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/lookup-identifier', { identifier: 'taylor@example.com' });
  });

  it('displays an API lookup failure without exposing implementation details', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { message: 'Account was not found' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email Address or Employee ID'), 'missing@example.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByText('Account was not found')).toBeInTheDocument();
  });
});
