import { describe, expect, it } from 'vitest';
import { buildDatabase } from '../seed';
import { answer, focus } from './engine';

const db = buildDatabase(new Date());
const maya = db.users.find((u) => u.id === 'u_maya')!;
const elena = db.users.find((u) => u.id === 'u_elena')!;

describe('focus', () => {
  it("puts Maya's overdue and urgent work first", () => {
    const result = focus(db, maya);
    expect(result.items).toHaveLength(3);
    expect(result.headline).toMatch(/1 overdue and 2 due today/);
    const ids = result.items.map((i) => i.task.id);
    expect(ids).toContain('t_error_states');
    expect(ids).toContain('t_research_readout');
  });
});

describe('answer', () => {
  it('summarizes a file from context and cites it', () => {
    const res = answer(db, maya, {
      message: 'Summarize this file',
      context: { type: 'file', id: 'fl_review_notes', label: 'Design review notes' },
    });
    expect(res.text).toMatch(/\*\*Decisions\*\*/);
    expect(res.citations.some((c) => c.type === 'file' && c.id === 'fl_review_notes')).toBe(true);
  });

  it('finds the blocker for the Safari fix', () => {
    const res = answer(db, maya, {
      message: "What's blocking this?",
      context: {
        type: 'task',
        id: 't_safari_autocomplete',
        label: 'Fix address autocomplete on Safari',
      },
    });
    expect(res.text).toMatch(/Blocked by/);
    expect(res.citations.map((c) => c.id)).toContain('t_api_key');
  });

  it('lists overdue work across my teams', () => {
    const res = answer(db, maya, { message: "What's overdue across my teams?", context: null });
    expect(res.text).toMatch(/overdue in your teams/);
  });

  it('only cites files the asker can open', () => {
    const res = answer(db, elena, { message: 'find files about checkout', context: null });
    expect(res.citations.filter((c) => c.type === 'file').map((c) => c.id)).not.toContain(
      'fl_spec',
    );
  });

  it('falls back to help', () => {
    expect(answer(db, maya, { message: 'hello', context: null }).text).toMatch(/Try:/);
  });
});
