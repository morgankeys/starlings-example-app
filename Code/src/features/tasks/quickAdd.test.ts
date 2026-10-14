import { describe, expect, it } from 'vitest';
import { users } from '@/mocks/seed/people';
import { parseQuickAdd } from './quickAdd';

// Wednesday, Oct 14 2026
const today = new Date(2026, 9, 14);

describe('parseQuickAdd', () => {
  it('pulls priority, assignee and due date out of the title', () => {
    expect(parseQuickAdd('Draft hero copy tomorrow !high @maya', users, today)).toEqual({
      title: 'Draft hero copy',
      priority: 'high',
      assigneeId: 'u_maya',
      dueDate: '2026-10-15',
    });
  });

  it('ignores accents in names', () => {
    expect(parseQuickAdd('Review @ines', users, today).assigneeId).toBe('u_ines');
  });

  it('resolves weekdays to the next occurrence', () => {
    expect(parseQuickAdd('Ship it fri', users, today).dueDate).toBe('2026-10-16');
    expect(parseQuickAdd('Plan on wednesday', users, today).dueDate).toBe('2026-10-21');
  });

  it('leaves unknown mentions in the title', () => {
    expect(parseQuickAdd('Email @nobody', users, today)).toEqual({ title: 'Email @nobody' });
  });

  it('does not treat words that contain a weekday as dates', () => {
    expect(parseQuickAdd('Update the monthly report', users, today)).toEqual({
      title: 'Update the monthly report',
    });
  });
});
