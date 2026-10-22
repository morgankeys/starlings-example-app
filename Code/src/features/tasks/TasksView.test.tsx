import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellActionsContext, type ShellActions } from '@/app/shellActions';
import { ToastProvider, TooltipProvider } from '@/components/ui';
import type { Task } from '@/domain/types';

const tasksApi = vi.hoisted(() => ({
  bulkUpdate: vi.fn(),
  bulkRemove: vi.fn(),
  bulkRestore: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/api/endpoints', () => ({ tasksApi }));

const state = vi.hoisted(() => ({ tasks: [] as Task[] }));
vi.mock('./api', async (original) => ({
  ...(await original<typeof import('./api')>()),
  useTasks: () => ({ data: state.tasks, error: null, isPending: false, refetch: vi.fn() }),
}));
vi.mock('@/features/org/api', () => ({
  useUserMap: () => new Map(),
  useUsers: () => ({ data: [] }),
  useTeams: () => ({ data: [] }),
  useProjects: () => ({
    data: [
      {
        id: 'p_1',
        name: 'Checkout',
        color: 'teal',
        teamId: 'tm_1',
        description: '',
        folderId: 'f',
      },
    ],
  }),
}));

vi.mock('./QuickAdd', () => ({ QuickAdd: () => null }));

const { TasksView } = await import('./TasksView');

const task = (id: string, title: string, status: Task['status']): Task => ({
  id,
  title,
  description: '',
  status,
  priority: 'medium',
  assigneeId: null,
  teamId: null,
  projectId: null,
  dueDate: null,
  labels: [],
  fileIds: [],
  createdById: 'u_1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  completedAt: null,
  commentCount: 0,
});

const shell: ShellActions = {
  newTask: vi.fn(),
  newFolder: vi.fn(),
  upload: vi.fn(),
  openSearch: vi.fn(),
  setCurrentFolder: vi.fn(),
};

function renderView(props: Partial<Parameters<typeof TasksView>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ToastProvider>
          <TooltipProvider>
            <ShellActionsContext.Provider value={shell}>
              <TasksView base={{}} {...props} />
            </ShellActionsContext.Provider>
          </TooltipProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const bar = () => within(screen.getByRole('toolbar'));
const box = (title: string) => screen.getByRole('checkbox', { name: `Select “${title}”` });
const checkedTitles = () =>
  screen
    .getAllByRole('checkbox', { name: /^Select “/ })
    .filter((c) => (c as HTMLInputElement).checked)
    .map((c) => c.getAttribute('aria-label'));

describe('TasksView selection', () => {
  beforeEach(() => {
    Object.values(tasksApi).forEach((fn) => fn.mockReset());
    state.tasks = [
      task('t_1', 'One', 'todo'),
      task('t_2', 'Two', 'todo'),
      task('t_3', 'Three', 'todo'),
      task('t_4', 'Four', 'todo'),
      task('t_5', 'Five', 'in_progress'),
    ];
  });

  it('selects a range with shift-click, in visible order', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(box('One'));
    await user.keyboard('{Shift>}');
    await user.click(box('Three'));
    await user.keyboard('{/Shift}');
    expect(checkedTitles()).toEqual(['Select “One”', 'Select “Two”', 'Select “Three”']);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('selects a whole group with a tri-state header checkbox', async () => {
    renderView();
    const header = screen.getByRole('checkbox', { name: 'Select all in To do' });
    await userEvent.click(box('Two'));
    expect((header as HTMLInputElement).indeterminate).toBe(true);
    await userEvent.click(header);
    expect(checkedTitles()).toHaveLength(4);
    expect((header as HTMLInputElement).indeterminate).toBe(false);
    expect((header as HTMLInputElement).checked).toBe(true);
    await userEvent.click(header);
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('clears the selection with Escape', async () => {
    renderView();
    await userEvent.click(box('One'));
    expect(screen.getByRole('toolbar', { name: /Bulk actions/ })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(checkedTitles()).toEqual([]);
  });

  it('has no selection when the view cannot edit', () => {
    renderView({ canAdd: false });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

describe('BulkActionBar', () => {
  beforeEach(() => {
    Object.values(tasksApi).forEach((fn) => fn.mockReset());
    state.tasks = [task('t_1', 'One', 'todo'), { ...task('t_2', 'Two', 'todo'), priority: 'low' }];
  });

  async function selectBoth() {
    await userEvent.click(box('One'));
    await userEvent.click(box('Two'));
  }

  it('sends one bulk request, toasts, and undoes with each task’s previous value', async () => {
    tasksApi.bulkUpdate.mockResolvedValueOnce({ updated: state.tasks, skipped: [] });
    renderView();
    await selectBoth();
    await userEvent.click(bar().getByRole('button', { name: 'Priority' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Urgent/ }));

    await vi.waitFor(() =>
      expect(tasksApi.bulkUpdate).toHaveBeenCalledWith([
        { id: 't_1', patch: { priority: 'urgent' } },
        { id: 't_2', patch: { priority: 'urgent' } },
      ]),
    );
    expect(await screen.findByText('Updated 2 tasks')).toBeInTheDocument();
    // The selection stays after an update.
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    tasksApi.bulkUpdate.mockResolvedValueOnce({ updated: state.tasks, skipped: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await vi.waitFor(() =>
      expect(tasksApi.bulkUpdate).toHaveBeenLastCalledWith([
        { id: 't_1', patch: { priority: 'medium' } },
        { id: 't_2', patch: { priority: 'low' } },
      ]),
    );
  });

  it('reports skipped tasks with their reason', async () => {
    tasksApi.bulkUpdate.mockResolvedValueOnce({
      updated: [state.tasks[0]],
      skipped: [{ id: 't_2', reason: 'You can only update tasks assigned to you' }],
    });
    renderView();
    await selectBoth();
    await userEvent.click(bar().getByRole('button', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Done/ }));
    expect(await screen.findByText('Updated 1 task · 1 skipped')).toBeInTheDocument();
    expect(screen.getByText('You can only update tasks assigned to you')).toBeInTheDocument();
  });

  it('shows a danger toast when the request fails', async () => {
    tasksApi.bulkUpdate.mockRejectedValueOnce(new Error('Nope'));
    renderView();
    await selectBoth();
    await userEvent.click(bar().getByRole('button', { name: 'Move to project' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Checkout/ }));
    expect(await screen.findByText("Couldn't update the tasks")).toBeInTheDocument();
    expect(screen.getByText('Nope')).toBeInTheDocument();
  });

  it('deletes, clears the selection, and restores on undo', async () => {
    tasksApi.bulkRemove.mockResolvedValueOnce({ updated: state.tasks, skipped: [] });
    tasksApi.bulkRestore.mockResolvedValueOnce({ updated: state.tasks, skipped: [] });
    renderView();
    await selectBoth();
    await userEvent.click(bar().getByRole('button', { name: 'Delete' }));
    expect(tasksApi.bulkRemove).toHaveBeenCalledWith(['t_1', 't_2']);
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(await screen.findByText('Deleted 2 tasks')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await vi.waitFor(() => expect(tasksApi.bulkRestore).toHaveBeenCalledWith(['t_1', 't_2']));
  });
});
