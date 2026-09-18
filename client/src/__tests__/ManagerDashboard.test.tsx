import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagerDashboard } from '../pages/ManagerDashboard';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../components/dashboard/AiInsightWidget', () => ({ AiInsightWidget: () => <div data-testid="ai-widget" /> }));
vi.mock('../components/dashboard/BlockerPriorityList', () => ({ BlockerPriorityList: () => <div data-testid="blocker-list" /> }));
vi.mock('../components/dashboard/TeamUpdateCard', () => ({
  TeamUpdateCard: ({ item }: { item: any }) => <div data-testid="team-update">{item.user.name}</div>,
}));
vi.mock('../components/common/ExportModal', () => ({ ExportModal: () => null }));
vi.mock('../components/department/DepartmentSwitcher', () => ({ DepartmentSwitcher: () => <div data-testid="department-switcher" /> }));
vi.mock('../components/department/RestrictedDepartmentView', () => ({ RestrictedDepartmentView: () => <div data-testid="restricted-view" /> }));

const manager = {
  id: 'manager-1', companyId: 'company-1', departmentId: 'dept-1', name: 'Manager', email: 'manager@example.com', role: 'MANAGER' as const,
};

const dashboard = {
  stats: { totalMembers: 3, submittedCount: 2, submissionRate: 67, pendingCount: 1, activeBlockersCount: 1, criticalBlockersCount: 1 },
  priorityBlockers: [],
  teamMembersFeed: [
    { user: { id: 'member-1', name: 'Member One', email: 'one@example.com', role: 'TEAM_MEMBER' }, hasSubmitted: true, blockerLevel: 'NONE' },
  ],
};

const renderPage = () => render(
  <AuthProvider>
    <ToastProvider><ManagerDashboard /></ToastProvider>
  </AuthProvider>
);

describe('ManagerDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('standup_token', 'mock-manager-token');
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/auth/me') return { data: { user: manager } };
      if (url === '/teams') return { data: { teams: [] } };
      if (url.startsWith('/manager/dashboard')) return { data: dashboard };
      if (url.startsWith('/ai/summary')) return { data: {} };
      return { data: {} };
    });
  });

  it('renders manager metrics and feed after loading', async () => {
    renderPage();

    expect(await screen.findByText('Manager Command Center')).toBeInTheDocument();
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Submitted Today')).toBeInTheDocument();
    expect(screen.getByText('Member One')).toBeInTheDocument();
  });

  it('shows the restricted view when the API denies team access', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/auth/me') return { data: { user: manager } };
      if (url === '/teams') return { data: { teams: [] } };
      if (url.startsWith('/manager/dashboard')) return { data: { restricted: true, team: null } };
      if (url.startsWith('/ai/summary')) return { data: {} };
      return { data: {} };
    });

    renderPage();

    expect(await screen.findByTestId('restricted-view')).toBeInTheDocument();
  });
});
