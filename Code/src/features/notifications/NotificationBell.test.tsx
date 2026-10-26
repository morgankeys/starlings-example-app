import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsApi } from '@/api/endpoints';
import type { NotificationList, NotificationView } from '@/domain/types';
import { NotificationBell } from './NotificationBell';

vi.mock('@/api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints')>()),
  notificationsApi: { list: vi.fn(), markRead: vi.fn() },
  usersApi: {
    list: vi.fn().mockResolvedValue([
      { id: 'u_chloe', name: 'Chloé Martin', color: 'violet' },
      { id: 'u_ava', name: 'Ava Lindqvist', color: 'amber' },
      { id: 'u_priya', name: 'Priya Raman', color: 'teal' },
    ]),
  },
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const item = (id: string, patch: Partial<NotificationView>): NotificationView => ({
  id,
  kind: 'commented',
  actorId: 'u_chloe',
  taskId: 't_error_states',
  title: 'Finalize address form error states',
  excerpt: 'Can we confirm the postcode wording?',
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  readAt: null,
  ...patch,
});

/** The "server": markRead changes it, list reads it. */
let server: NotificationList;
const unreadOf = (items: NotificationView[]) => items.filter((n) => !n.readAt).length;
const setServer = (items: NotificationView[]) => {
  server = { items, unreadCount: unreadOf(items) };
};

beforeEach(() => {
  vi.mocked(notificationsApi.list).mockReset();
  vi.mocked(notificationsApi.markRead).mockReset();
  vi.mocked(notificationsApi.list).mockImplementation(async () => structuredClone(server));
  vi.mocked(notificationsApi.markRead).mockImplementation(async (input) => {
    const readAt = new Date().toISOString();
    for (const n of server.items) {
      if (!n.readAt && ('all' in input || input.ids.includes(n.id))) n.readAt = readAt;
    }
    server.unreadCount = unreadOf(server.items);
    return { unreadCount: server.unreadCount };
  });
  setServer([
    item('nt_1', {}),
    item('nt_2', {
      kind: 'assigned',
      actorId: 'u_ava',
      taskId: 't_shot_list',
      title: 'Approve hero shot list',
      excerpt: undefined,
      createdAt: daysAgo(1),
    }),
    item('nt_3', {
      kind: 'shared',
      actorId: 'u_priya',
      taskId: undefined,
      fileId: 'fl_spec',
      title: 'Checkout spec v2.docx',
      excerpt: undefined,
      createdAt: daysAgo(3),
      readAt: daysAgo(2),
    }),
  ]);
});

function Location() {
  return <span data-testid="search">{useLocation().search}</span>;
}

function renderBell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NotificationBell', () => {
  it('shows the unread count in the badge and in the accessible name', async () => {
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notifications, 2 unread' });
    expect(bell).toHaveTextContent('2');
  });

  it('caps the badge at 9+', async () => {
    setServer(Array.from({ length: 12 }, (_, i) => item(`nt_${i}`, {})));
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notifications, 12 unread' });
    expect(bell).toHaveTextContent('9+');
  });

  it('has no badge when everything is read', async () => {
    setServer([item('nt_1', { readAt: daysAgo(0) })]);
    renderBell();
    const bell = await screen.findByRole('button', { name: 'Notifications' });
    expect(bell).not.toHaveTextContent(/\d/);
  });

  it('lists notifications grouped Today and Earlier, with excerpts and unread dots', async () => {
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notifications, 2 unread/ }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });

    expect(within(panel).getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Earlier' })).toBeInTheDocument();

    const comment = within(panel).getByRole('button', { name: /Chloé commented on/ });
    expect(comment).toHaveTextContent('Chloé commented on Finalize address form error states');
    expect(comment).toHaveTextContent('Can we confirm the postcode wording?');
    expect(comment).toHaveTextContent('5m ago');
    expect(within(comment).getByRole('img', { name: 'Unread' })).toBeInTheDocument();

    expect(
      within(panel).getByRole('button', { name: /Ava assigned you Approve hero shot list/ }),
    ).toBeInTheDocument();
    const shared = within(panel).getByRole('button', {
      name: /Priya shared Checkout spec v2.docx with you/,
    });
    expect(within(shared).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument();
  });

  it('opens the task and marks the notification read when an item is clicked', async () => {
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notifications, 2 unread/ }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    await userEvent.click(within(panel).getByRole('button', { name: /Ava assigned you/ }));

    expect(notificationsApi.markRead).toHaveBeenCalledWith({ ids: ['nt_2'] });
    expect(screen.getByTestId('search')).toHaveTextContent('?task=t_shot_list');
    await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens a file for a file notification, and does not re-mark one already read', async () => {
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notifications, 2 unread/ }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    await userEvent.click(within(panel).getByRole('button', { name: /Priya shared/ }));

    expect(notificationsApi.markRead).not.toHaveBeenCalled();
    expect(screen.getByTestId('search')).toHaveTextContent('?file=fl_spec');
  });

  it('marks everything read', async () => {
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: /Notifications, 2 unread/ }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    await userEvent.click(within(panel).getByRole('button', { name: 'Mark all as read' }));

    expect(notificationsApi.markRead).toHaveBeenCalledWith({ all: true });
    await screen.findByRole('button', { name: 'Notifications' });
    expect(within(panel).getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    expect(within(panel).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    setServer([]);
    renderBell();
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(within(panel).getByText("You're all caught up")).toBeInTheDocument();
  });
});
