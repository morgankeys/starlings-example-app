import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { ToastProvider, TooltipProvider } from '@/components/ui';
import type { Organization, User } from '@/domain/types';

const endpoints = vi.hoisted(() => ({
  usersApi: { list: vi.fn(), get: vi.fn(), invite: vi.fn(), update: vi.fn() },
  teamsApi: { list: vi.fn() },
  orgApi: { update: vi.fn() },
  projectsApi: { list: vi.fn(), get: vi.fn() },
}));
vi.mock('@/api/endpoints', () => endpoints);

const { MembersTab } = await import('./MembersTab');

const org: Organization = {
  id: 'o',
  name: 'Meridian',
  domain: 'meridianoutdoor.com',
  plan: 'Business',
};
const person = (id: string, name: string, role: User['role'] = 'member'): User => ({
  id,
  name,
  email: `${id}@meridianoutdoor.com`,
  title: 'Title',
  role,
  status: 'active',
  color: 'teal',
  location: '',
});
const dana = person('dana', 'Dana Whitfield', 'admin');
const maya = person('maya', 'Maya Okafor');
const leo = person('leo', 'Leo Brandt');

function renderTab(me: User) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ToastProvider>
          <TooltipProvider>
            <MembersTab me={me} org={org} />
          </TooltipProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  endpoints.usersApi.list.mockResolvedValue([dana, maya, leo]);
  endpoints.teamsApi.list.mockResolvedValue([
    {
      id: 'tm',
      name: 'Product Design',
      description: '',
      color: 'violet',
      openTaskCount: 0,
      members: [
        { userId: 'maya', role: 'lead' },
        { userId: 'leo', role: 'member' },
      ],
    },
  ]);
});

describe('MembersTab', () => {
  it('lets an admin change a role', async () => {
    endpoints.usersApi.update.mockResolvedValue({ ...leo, role: 'admin' });
    renderTab(dana);
    const select = await screen.findByLabelText('Role for Leo Brandt');
    await userEvent.selectOptions(select, 'admin');
    await waitFor(() =>
      expect(endpoints.usersApi.update).toHaveBeenCalledWith('leo', { role: 'admin' }),
    );
    expect(await screen.findByText('Leo Brandt is now workspace admin')).toBeInTheDocument();
  });

  it('disables your own role and deactivate controls', async () => {
    renderTab(dana);
    expect(await screen.findByLabelText('Role for Dana Whitfield')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate Dana Whitfield' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate Leo Brandt' })).toBeEnabled();
  });

  it('shows API validation errors inline in the invite dialog', async () => {
    endpoints.usersApi.invite.mockRejectedValue(
      new ApiError(400, 'bad_request', 'Members need a meridianoutdoor.com email address'),
    );
    renderTab(dana);
    await userEvent.click(await screen.findByRole('button', { name: 'Invite member' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Pat Doe');
    await userEvent.type(within(dialog).getByLabelText('Email'), 'pat@gmail.com');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Buyer');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }));
    const message = await within(dialog).findByText(
      'Members need a meridianoutdoor.com email address',
    );
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(message).toBeInTheDocument();
    expect(endpoints.usersApi.invite).toHaveBeenCalledWith({
      name: 'Pat Doe',
      email: 'pat@gmail.com',
      title: 'Buyer',
      role: 'member',
      company: '',
    });
  });

  it('asks for a company when inviting a guest', async () => {
    renderTab(dana);
    await userEvent.click(await screen.findByRole('button', { name: 'Invite member' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText('Company')).not.toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), 'guest');
    expect(within(dialog).getByLabelText('Company')).toBeInTheDocument();
  });

  it('confirms before deactivating and shows a blocked-lead error', async () => {
    endpoints.usersApi.update.mockRejectedValue(
      new ApiError(400, 'bad_request', 'Maya Okafor is the only lead of Product Design.'),
    );
    renderTab(dana);
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Maya Okafor' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/removed from Product Design/)).toBeInTheDocument();
    expect(endpoints.usersApi.update).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'only lead of Product Design',
    );
  });

  it('is read-only for non-admins', async () => {
    renderTab(maya);
    expect(await screen.findByText(/Only workspace admins can manage members/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role for Leo Brandt')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deactivate/ })).not.toBeInTheDocument();
  });
});
