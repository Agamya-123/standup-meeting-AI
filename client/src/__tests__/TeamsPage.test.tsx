import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamsPage } from '../pages/TeamsPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock('../components/department/AccessRequestsPanel', () => ({
  AccessRequestsPanel: () => <div data-testid="access-requests" />,
}));

const admin = {
  id: 'admin-1', companyId: 'company-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' as const,
  departmentId: null, teamId: null, company: { id: 'company-1', name: 'Acme', slug: 'acme' },
};

const renderPage = () => render(
  <AuthProvider>
    <ToastProvider><TeamsPage /></ToastProvider>
  </AuthProvider>
);

describe('TeamsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('standup_token', 'mock-admin-token');
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/teams') return { data: { teams: [{ id: 'team-1', companyId: 'company-1', departmentId: 'dept-1', name: 'Platform Team', description: 'APIs', members: [] }] } };
      if (url === '/departments') return { data: { departments: [{ id: 'dept-1', companyId: 'company-1', name: 'Engineering', description: 'Builds products', isActive: true }] } };
      if (url === '/auth/employees') return { data: { employees: [admin] } };
      if (url === '/auth/me') return { data: { user: admin } };
      return { data: {} };
    });
  });

  it('renders the organization hierarchy from API data', async () => {
    renderPage();

    expect(await screen.findByText('Organization & Teams')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Platform Team')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('shows admin management actions', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /create team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
  });

  it('shows an empty state when no departments or teams exist', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/auth/me') return { data: { user: admin } };
      if (url === '/teams') return { data: { teams: [] } };
      if (url === '/departments') return { data: { departments: [] } };
      if (url === '/auth/employees') return { data: { employees: [] } };
      return { data: {} };
    });

    renderPage();

    expect(await screen.findByText('No departments or teams found for this company yet.')).toBeInTheDocument();
  });
});
