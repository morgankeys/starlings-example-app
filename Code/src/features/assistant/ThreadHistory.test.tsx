import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantApi } from '@/api/endpoints';
import { ToastProvider, TooltipProvider } from '@/components/ui';
import type { AssistantThread, AssistantThreadSummary } from '@/domain/types';
import { AssistantPanel } from './AssistantPanel';
import { AssistantProvider } from './AssistantProvider';

vi.mock('@/api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints')>()),
  assistantApi: {
    focus: vi.fn(),
    threads: vi.fn(),
    thread: vi.fn(),
    renameThread: vi.fn(),
    deleteThread: vi.fn(),
    restoreThread: vi.fn(),
    resolveActions: vi.fn(),
  },
}));

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

let summaries: AssistantThreadSummary[];
const OVERDUE: AssistantThread = {
  id: 'th_overdue',
  title: 'What’s overdue across my teams?',
  createdAt: iso(3_600_000),
  updatedAt: iso(3_600_000),
  messages: [
    {
      id: 'm1',
      role: 'user',
      text: 'What’s overdue across my teams?',
      citations: [],
      context: null,
    },
    {
      id: 'm2',
      role: 'assistant',
      text: '1 task overdue: [[task:t_synth_r2]] — overdue by 1 day',
      citations: [{ type: 'task', id: 't_synth_r2', title: 'Synthesize round 2 interviews' }],
      context: null,
    },
  ],
};

beforeEach(() => {
  summaries = [
    { id: 'th_overdue', title: OVERDUE.title, updatedAt: iso(3_600_000), messageCount: 2 },
    {
      id: 'th_review',
      title: 'Summarize this file',
      updatedAt: iso(3 * 86_400_000),
      messageCount: 4,
    },
  ];
  vi.mocked(assistantApi.threads).mockReset();
  vi.mocked(assistantApi.threads).mockImplementation(async () => summaries);
  vi.mocked(assistantApi.thread).mockReset();
  vi.mocked(assistantApi.thread).mockResolvedValue(OVERDUE);
  vi.mocked(assistantApi.deleteThread).mockReset();
  vi.mocked(assistantApi.deleteThread).mockImplementation(async (id) => {
    summaries = summaries.filter((t) => t.id !== id);
  });
  vi.mocked(assistantApi.restoreThread).mockReset();
  vi.mocked(assistantApi.restoreThread).mockResolvedValue(OVERDUE);
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter>
            <AssistantProvider>
              <AssistantPanel />
            </AssistantProvider>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

const openHistory = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'History' }));

describe('Ask Birdy history', () => {
  it('lists past conversations with time ago and message counts', async () => {
    const user = userEvent.setup();
    setup();
    await openHistory(user);
    const rows = await screen.findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(OVERDUE.title)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/1h ago · 2 messages/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/3d ago · 4 messages/)).toBeInTheDocument();
  });

  it('opens a conversation with its messages and citation chips', async () => {
    const user = userEvent.setup();
    setup();
    await openHistory(user);
    await user.click(
      await screen.findByRole('button', { name: /^What’s overdue across my teams\?.*ago/ }),
    );

    expect(assistantApi.thread).toHaveBeenCalledWith('th_overdue');
    expect(await screen.findByText(/1 task overdue/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Synthesize round 2 interviews/ }),
    ).toBeInTheDocument();
    // Back in the chat, the open thread is the highlighted one in History.
    await openHistory(user);
    const current = await screen.findByRole('button', {
      name: /^What’s overdue across my teams\?.*ago/,
    });
    expect(current).toHaveAttribute('aria-current', 'true');
  });

  it('deletes a conversation and can undo it', async () => {
    const user = userEvent.setup();
    setup();
    await openHistory(user);
    await user.click(await screen.findByRole('button', { name: /Delete “Summarize this file”/ }));

    await waitFor(() => expect(assistantApi.deleteThread).toHaveBeenCalledWith('th_review'));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(assistantApi.restoreThread).toHaveBeenCalledWith('th_review'));
  });

  it('shows an empty state, and Escape returns to the chat', async () => {
    summaries = [];
    const user = userEvent.setup();
    setup();
    await openHistory(user);
    expect(await screen.findByText('No past conversations yet')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(await screen.findByText('What can I help with?')).toBeInTheDocument();
    expect(screen.queryByText('No past conversations yet')).not.toBeInTheDocument();
  });

  it('Back returns to the chat', async () => {
    const user = userEvent.setup();
    setup();
    await openHistory(user);
    await user.click(await screen.findByRole('button', { name: 'Back to chat' }));
    expect(await screen.findByText('What can I help with?')).toBeInTheDocument();
  });
});
