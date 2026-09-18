import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandupForm } from '../components/standup/StandupForm';
import { ToastProvider } from '../context/ToastContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const renderForm = () =>
  render(
    <ToastProvider>
      <StandupForm />
    </ToastProvider>
  );

describe('StandupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { submitted: false, standup: null } });
  });

  it('renders a standup form after loading today status', async () => {
    renderForm();

    expect(await screen.findByText('Daily Standup Check-in')).toBeInTheDocument();
    expect(screen.getByText(/What did you accomplish yesterday/i)).toBeInTheDocument();
    expect(screen.getByText(/What are you planning to work on today/i)).toBeInTheDocument();
  });

  it('shows a local error if yesterday accomplishments are empty', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Daily Standup Check-in');

    await user.click(screen.getByRole('button', { name: 'Submit Daily Standup' }));

    expect(screen.getByText('Please add at least one accomplishment for yesterday.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits a valid standup payload', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Daily Standup Check-in');

    const fields = screen.getAllByRole('textbox');
    await user.type(fields[0], 'Finished API test coverage');
    await user.type(fields[1], 'Review pull request feedback');
    await user.click(screen.getByRole('button', { name: 'Submit Daily Standup' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/standups', {
        yesterdayUpdates: ['Finished API test coverage'],
        todayPlans: ['Review pull request feedback'],
        blockers: [],
        blockerLevel: 'NONE',
      })
    );
  });

  it('allows selecting a critical blocker and previews its state', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Daily Standup Check-in');

    await user.click(screen.getByRole('button', { name: /Critical Blocker/i }));
    expect(screen.getByText('Add Another Blocker Description')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Blockers (CRITICAL):')).toBeInTheDocument();
  });
});
