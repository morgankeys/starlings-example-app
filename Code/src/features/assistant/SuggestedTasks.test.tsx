import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tasksApi } from '@/api/endpoints';
import { ToastProvider } from '@/components/ui';
import type { SuggestedTask } from '@/domain/types';
import type { ActionsResult } from './AssistantProvider';
import { SuggestedTasks } from './SuggestedTasks';

vi.mock('@/api/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints')>()),
  tasksApi: { create: vi.fn(), remove: vi.fn() },
  usersApi: {
    list: vi.fn().mockResolvedValue([
      { id: 'u_priya', name: 'Priya Raman', color: 'violet' },
      { id: 'u_kira', name: 'Kira Sato', color: 'amber' },
    ]),
  },
  teamsApi: { list: vi.fn().mockResolvedValue([]) },
}));

const suggestion = (n: number, patch: Partial<SuggestedTask> = {}): SuggestedTask => ({
  key: `fl_kickoff:${n}`,
  title: `Do thing ${n}`,
  description: 'From “Kickoff notes”.',
  assigneeId: 'u_priya',
  dueDate: null,
  priority: 'medium',
  projectId: 'p_supplier',
  teamId: 'tm_ops',
  fileIds: ['fl_kickoff'],
  existingTaskId: null,
  ...patch,
});

const ITEMS = [
  suggestion(1),
  suggestion(2, { assigneeId: 'u_kira' }),
  suggestion(3),
  suggestion(4, { existingTaskId: 't_existing', title: 'Already on the board' }),
];

function Location() {
  const { search } = useLocation();
  return <span data-testid="search">{search}</span>;
}

function setup(onResolve?: (r: ActionsResult) => void, resolution?: ActionsResult) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <SuggestedTasks items={ITEMS} onResolve={onResolve} resolution={resolution} />
          <Location />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

let nextId = 0;
beforeEach(() => {
  nextId = 0;
  vi.mocked(tasksApi.create).mockReset();
  vi.mocked(tasksApi.remove).mockReset();
  vi.mocked(tasksApi.create).mockImplementation(async (input) => {
    nextId += 1;
    return { id: `t_new${nextId}`, ...input } as Awaited<ReturnType<typeof tasksApi.create>>;
  });
  vi.mocked(tasksApi.remove).mockResolvedValue(undefined as never);
});

describe('SuggestedTasks', () => {
  it('lists a row per suggestion, with tracked ones disabled and linked to the task', async () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Suggested tasks' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Task title' })).toHaveLength(3);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);

    const tracked = screen.getByRole('checkbox', { name: 'Create task: Already on the board' });
    expect(tracked).toBeDisabled();
    expect(tracked).not.toBeChecked();
    expect(screen.getByText('Already tracked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create 3 tasks' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Open task: Already on the board' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?task=t_existing');
  });

  it('shows who each task is assigned to', async () => {
    setup();
    expect(
      await screen.findByRole('button', { name: 'Assignee for Do thing 2: Kira Sato' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Due date for Do thing 1: No date' })).toBeVisible();
  });

  it('updates the create button as rows are unchecked', async () => {
    setup();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create task: Do thing 2' }));
    expect(screen.getByRole('button', { name: 'Create 2 tasks' })).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create task: Do thing 1' }));
    expect(screen.getByRole('button', { name: 'Create 1 task' })).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create task: Do thing 3' }));
    expect(screen.getByRole('button', { name: 'Create tasks' })).toBeDisabled();
  });

  it('creates the selected tasks with their edits, then offers undo', async () => {
    const onResolve = vi.fn();
    setup(onResolve);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Create task: Do thing 2' }));
    const first = screen.getAllByRole('textbox', { name: 'Task title' })[0];
    await userEvent.clear(first);
    await userEvent.type(first, 'Send the invites');
    await userEvent.click(screen.getByRole('button', { name: 'Create 2 tasks' }));

    await waitFor(() => expect(tasksApi.create).toHaveBeenCalledTimes(2));
    expect(tasksApi.create).toHaveBeenNthCalledWith(1, {
      title: 'Send the invites',
      description: 'From “Kickoff notes”.',
      assigneeId: 'u_priya',
      dueDate: null,
      priority: 'medium',
      projectId: 'p_supplier',
      teamId: 'tm_ops',
      fileIds: ['fl_kickoff'],
    });
    expect(tasksApi.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'Do thing 3' }),
    );

    // The card collapses into a confirmation with a chip per new task.
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Created 2 tasks');
    expect(screen.queryByRole('button', { name: /^Create/ })).toBeNull();
    expect(onResolve).toHaveBeenCalledWith({
      kind: 'created',
      tasks: [
        { id: 't_new1', title: 'Send the invites' },
        { id: 't_new2', title: 'Do thing 3' },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'Do thing 3' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?task=t_new2');

    // The toast's Undo deletes exactly what was created.
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(tasksApi.remove).toHaveBeenCalledTimes(2));
    expect(tasksApi.remove).toHaveBeenCalledWith('t_new1');
    expect(tasksApi.remove).toHaveBeenCalledWith('t_new2');
    await waitFor(() => expect(onResolve).toHaveBeenLastCalledWith({ kind: 'undone', count: 2 }));
  });

  it('still undoes after the card has unmounted', async () => {
    const onResolve = vi.fn();
    function Harness() {
      const [shown, setShown] = useState(true);
      return (
        <>
          {shown && <SuggestedTasks items={ITEMS} onResolve={onResolve} />}
          <button type="button" onClick={() => setShown(false)}>
            Close panel
          </button>
        </>
      );
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter>
            <Harness />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create 3 tasks' }));
    await screen.findByRole('button', { name: 'Undo' });
    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(screen.queryByText('Suggested tasks')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(tasksApi.remove).toHaveBeenCalledTimes(3));
  });

  it('keeps the rows and does not repeat finished ones when something fails', async () => {
    vi.mocked(tasksApi.create).mockImplementation(async (input) => {
      if (input.title === 'Do thing 2') throw new Error('Something went wrong');
      nextId += 1;
      return { id: `t_new${nextId}`, ...input } as Awaited<ReturnType<typeof tasksApi.create>>;
    });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Create 3 tasks' }));

    expect(await screen.findByText("Couldn't create 1 task")).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Two were made and are marked as such; the failed row is still there to retry.
    expect(screen.getAllByText('Created')).toHaveLength(2);
    expect(screen.getByRole('textbox', { name: 'Task title' })).toHaveValue('Do thing 2');
    expect(screen.getByRole('button', { name: 'Create 1 task' })).toBeEnabled();

    vi.mocked(tasksApi.create).mockClear();
    vi.mocked(tasksApi.create).mockImplementation(async (input) => {
      nextId += 1;
      return { id: `t_new${nextId}`, ...input } as Awaited<ReturnType<typeof tasksApi.create>>;
    });
    await userEvent.click(screen.getByRole('button', { name: 'Create 1 task' }));
    await waitFor(() => expect(tasksApi.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Created 3 tasks');
  });

  it('records a dismissal and renders nothing afterwards', async () => {
    const onResolve = vi.fn();
    const { container } = setup(onResolve);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onResolve).toHaveBeenCalledWith({ kind: 'dismissed' });
    expect(tasksApi.create).not.toHaveBeenCalled();
    expect(container.querySelector('[data-component="SuggestedTasks"]')).toBeNull();
  });

  it('shows the stored outcome instead of the form when remounted', () => {
    setup(undefined, { kind: 'created', tasks: [{ id: 't_a', title: 'Already made' }] });
    expect(screen.getByRole('status')).toHaveTextContent('Created 1 task');
    expect(screen.getByRole('button', { name: 'Already made' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
