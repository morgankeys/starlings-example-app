import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShellActionsContext, type ShellActions } from '@/app/shellActions';
import { ToastProvider, TooltipProvider } from '@/components/ui';
import type { Task } from '@/domain/types';

const mutate = vi.fn();
vi.mock('./api', () => ({ useUpdateTask: () => ({ mutate }) }));
vi.mock('@/features/org/api', () => ({
  useUserMap: () => new Map(),
  useProjects: () => ({ data: [] }),
}));

const { TaskBoard } = await import('./TaskBoard');

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

function renderBoard(props: Partial<Parameters<typeof TaskBoard>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ToastProvider>
          <TooltipProvider>
            <ShellActionsContext.Provider value={shell}>
              <TaskBoard
                tasks={[task('t_1', 'Write brief', 'todo'), task('t_2', 'Ship it', 'done')]}
                {...props}
              />
            </ShellActionsContext.Provider>
          </TooltipProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TaskBoard', () => {
  beforeEach(() => {
    mutate.mockClear();
    vi.mocked(shell.newTask).mockClear();
  });

  it('puts tasks in their columns and shows a placeholder for empty ones', () => {
    renderBoard();
    const todo = screen.getByRole('region', { name: 'To do' });
    expect(within(todo).getByText('Write brief')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /In review/ })).getByText('No tasks'),
    ).toBeInTheDocument();
  });

  it('moves a task with the Move to menu', async () => {
    renderBoard();
    await userEvent.click(screen.getByRole('button', { name: 'Move “Write brief”' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /In review/ }));
    // Menu actions run on the next tick.
    await vi.waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        { id: 't_1', patch: { status: 'in_review' } },
        expect.objectContaining({ onError: expect.any(Function) }),
      ),
    );
  });

  it('adds a task to a column with the quick add defaults, and hides add when canAdd is false', async () => {
    const { unmount } = renderBoard({ quickAddDefaults: { projectId: 'p_1' } });
    await userEvent.click(screen.getByRole('button', { name: 'Add task to In progress' }));
    expect(shell.newTask).toHaveBeenCalledWith({ projectId: 'p_1', status: 'in_progress' });
    unmount();
    renderBoard({ canAdd: false });
    expect(screen.queryByRole('button', { name: /Add task to/ })).toBeNull();
  });
});
