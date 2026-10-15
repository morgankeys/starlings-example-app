import { describe, expect, it } from 'vitest';
import type { Task } from '@/domain/types';
import { boardColumns } from './grouping';

const makeTask = (id: string, status: Task['status']): Task => ({
  id,
  title: id,
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

const tasks = [
  makeTask('a', 'done'),
  makeTask('b', 'todo'),
  makeTask('c', 'in_review'),
  makeTask('d', 'todo'),
];

describe('boardColumns', () => {
  it('returns all four columns in board order and keeps task order', () => {
    const cols = boardColumns(tasks);
    expect(cols.map((c) => c.status)).toEqual(['todo', 'in_progress', 'in_review', 'done']);
    expect(cols.map((c) => c.label)).toEqual(['To do', 'In progress', 'In review', 'Done']);
    expect(cols[0]?.tasks.map((t) => t.id)).toEqual(['b', 'd']);
    expect(cols[1]?.tasks).toEqual([]);
  });

  it('limits columns to the status filter, still in board order', () => {
    const cols = boardColumns(tasks, { statuses: ['done', 'todo'] });
    expect(cols.map((c) => c.status)).toEqual(['todo', 'done']);
  });

  it('omits Done when includeDone is false', () => {
    expect(boardColumns(tasks, { includeDone: false }).map((c) => c.status)).toEqual([
      'todo',
      'in_progress',
      'in_review',
    ]);
    expect(boardColumns(tasks, { statuses: ['done'], includeDone: false })).toEqual([]);
  });
});
