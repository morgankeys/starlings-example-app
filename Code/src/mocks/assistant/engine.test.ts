import { addDays, format } from 'date-fns';
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

describe('suggested tasks', () => {
  const ask = (message: string, context: Parameters<typeof answer>[2]['context'], who = maya) =>
    answer(db, who, { message, context });
  const file = (id: string, label: string) => ({ type: 'file' as const, id, label });

  it('recognizes every action item in the review notes as already tracked', () => {
    const res = ask('Turn the action items into tasks', file('fl_review_notes', 'Review notes'));
    expect(res.actions.map((a) => [a.title, a.assigneeId, a.existingTaskId])).toEqual([
      ['Finalize address form error states', 'u_maya', 't_error_states'],
      ['Add the Apple Pay flow to the spec', 'u_leo', 't_apple_pay'],
      ['Send the address-service API key to Chloé', 'u_ben', 't_api_key'],
      ['Synthesize round 2 interviews', 'u_sam', 't_synth_r2'],
    ]);
    expect(res.text).toMatch(/All 4 action items are already tracked/);
    expect(res.citations.map((c) => c.id)).toContain('t_api_key');
  });

  it('recognizes every action item in the launch sync notes as already tracked', () => {
    const res = ask('make tasks from this', file('fl_launch_notes', 'Launch sync notes'));
    expect(res.actions.map((a) => a.existingTaskId)).toEqual([
      't_tent_copy',
      't_shot_list',
      't_page_map',
      't_landing_layout',
    ]);
  });

  it('turns untracked action items into suggestions with project, team and file', () => {
    const res = ask('create tasks from the notes', file('fl_pilot_kickoff', 'Kickoff notes'));
    expect(res.actions.map((a) => [a.title, a.assigneeId, a.existingTaskId])).toEqual([
      ['Send portal invites to the three pilot vendors', 'u_priya', null],
      ['Set up a staging environment for the pilot', 'u_kira', null],
      ['Write a test plan for CSV inventory uploads', 'u_omar', null],
      ['Draft the pilot announcement email', 'u_marcus', null],
    ]);
    for (const a of res.actions) {
      expect(a).toMatchObject({
        projectId: 'p_supplier',
        teamId: 'tm_ops',
        fileIds: ['fl_pilot_kickoff'],
        priority: 'medium',
        dueDate: null,
        description: 'From “Supplier pilot kickoff notes.docx”.',
      });
    }
    expect(res.text).toMatch(/I can turn 4 of these into tasks\. Review them below\.$/);
  });

  it('adds suggestions to summaries and decision lists too', () => {
    const summary = ask('Summarize this file', file('fl_pilot_kickoff', 'Kickoff notes'));
    expect(summary.actions).toHaveLength(4);
    expect(summary.text).toMatch(/I can turn 4 of these into tasks/);
    const decisions = ask('What was decided?', file('fl_review_notes', 'Review notes'));
    expect(decisions.actions).toHaveLength(4);
  });

  it('offers nothing for files without action items', () => {
    const res = ask('Summarize this file', file('fl_spec', 'Checkout spec'));
    expect(res.actions).toEqual([]);
    expect(res.text).not.toMatch(/into tasks/);
  });

  it('ignores deleted tasks when checking what is already tracked', () => {
    const copy = {
      ...db,
      tasks: db.tasks.map((t) => (t.id === 't_api_key' ? { ...t, deletedAt: 'x' } : t)),
    };
    const res = answer(copy, maya, {
      message: 'turn the action items into tasks',
      context: file('fl_review_notes', 'Review notes'),
    });
    expect(res.actions.find((a) => a.assigneeId === 'u_ben')?.existingTaskId).toBeNull();
  });

  it('suggests one task for an explicit request, assigned to the asker', () => {
    const res = ask('create a task to send the recap tomorrow !high', null);
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0]).toMatchObject({
      title: 'Send the recap',
      priority: 'high',
      assigneeId: 'u_maya',
      dueDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      existingTaskId: null,
    });
    expect(res.text).toMatch(/Review it below/);
  });

  it('understands the other ways of asking and honors @name', () => {
    expect(ask('remind me to call the printer', null).actions[0].title).toBe('Call the printer');
    expect(ask('todo: book the weather day @ava', null).actions[0]).toMatchObject({
      title: 'Book the weather day',
      assigneeId: 'u_ava',
    });
    expect(ask('Add a task: review the budget', null).actions[0].title).toBe('Review the budget');
  });

  it('inherits project and team from the task being viewed', () => {
    const res = ask('Create a follow-up task', {
      type: 'task',
      id: 't_safari_autocomplete',
      label: 'Fix address autocomplete on Safari',
    });
    expect(res.actions[0]).toMatchObject({
      title: 'Follow up on Fix address autocomplete on Safari',
      projectId: 'p_checkout',
      teamId: 'tm_eng',
    });
  });

  it('links the file when asked from a file', () => {
    const res = ask('create a task to confirm the vendor dates', file('fl_vendors', 'Vendor list'));
    expect(res.actions[0]).toMatchObject({ fileIds: ['fl_vendors'], projectId: 'p_supplier' });
  });

  it('flags a requested task that already exists', () => {
    const res = ask('create a task to finalize address form error states', null);
    expect(res.actions[0].existingTaskId).toBe('t_error_states');
    expect(res.text).toMatch(/already covers that/);
  });

  it('asks what the task should be when the request is empty', () => {
    const res = ask('add a task', null);
    expect(res.actions).toEqual([]);
    expect(res.text).toMatch(/What should the task be/);
  });

  it('never suggests tasks to guests', () => {
    const context = file('fl_shoot_brief', 'Hero shoot brief');
    expect(ask('Summarize this file', context, elena).actions).toEqual([]);
    expect(ask('turn the action items into tasks', context, elena).actions).toEqual([]);
    const created = ask('create a task to send the recap', null, elena);
    expect(created.actions).toEqual([]);
    expect(created.text).toMatch(/Guests can't create tasks/);
  });
});
