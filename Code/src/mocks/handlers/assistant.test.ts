import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AssistantStreamEvent, AssistantThread, AssistantThreadSummary } from '@/domain/types';
import { getDb, resetDb } from '../db';
import { assistantHandlers, titleFrom } from './assistant';

const server = setupServer(...assistantHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

const url = (path: string) => `${location.origin}/api/v1${path}`;

function as(userId: string) {
  getDb().sessionUserId = userId;
}

beforeEach(() => {
  localStorage.setItem('birdy.demo', JSON.stringify({ latency: 'none', failRequests: false }));
  resetDb();
  as('u_maya');
});
afterEach(() => localStorage.clear());

async function ask(message: string, threadId?: string, context: unknown = null) {
  const res = await fetch(url('/assistant/messages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, threadId }),
  });
  if (!res.ok) return { res, events: [] as AssistantStreamEvent[] };
  const events = (await res.text())
    .split('\n\n')
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice(6)) as AssistantStreamEvent);
  return { res, events };
}

const json = async <T>(path: string, init?: RequestInit) => {
  const res = await fetch(url(path), {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  return { res, data: res.status === 204 ? null : ((await res.json()) as T) };
};

const threadOf = (events: AssistantStreamEvent[]) =>
  events.find((e) => e.type === 'thread') as { type: 'thread'; id: string };

describe('assistant threads', () => {
  it('seeds past conversations for Maya, newest first', async () => {
    const { data } = await json<AssistantThreadSummary[]>('/assistant/threads');
    expect(data!.length).toBeGreaterThanOrEqual(2);
    const times = data!.map((t) => t.updatedAt);
    expect(times).toEqual([...times].sort().reverse());
    const first = await json<AssistantThread>(`/assistant/threads/${data![0].id}`);
    expect(first.data!.messages[1].text).toMatch(/\[\[task:/);
    expect(first.data!.messages[1].citations.length).toBeGreaterThan(0);
  });

  it('creates a thread on the first message and appends to it on later ones', async () => {
    const before = (await json<AssistantThreadSummary[]>('/assistant/threads')).data!.length;
    const first = await ask("What's overdue across my teams?");
    expect(first.events[0].type).toBe('thread');
    const id = threadOf(first.events).id;
    expect(first.events.at(-1)).toMatchObject({ type: 'done' });

    const second = await ask('What is blocked right now?', id);
    expect(threadOf(second.events).id).toBe(id);

    const list = (await json<AssistantThreadSummary[]>('/assistant/threads')).data!;
    expect(list).toHaveLength(before + 1);
    expect(list[0]).toMatchObject({
      id,
      title: "What's overdue across my teams?",
      messageCount: 4,
    });

    const thread = (await json<AssistantThread>(`/assistant/threads/${id}`)).data!;
    expect(thread.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    expect(thread.messages[0].text).toBe("What's overdue across my teams?");
    expect(thread.messages[1].citations.length).toBeGreaterThan(0);
  });

  it('titles a thread from the first question, trimmed to about 60 characters', () => {
    const long = `Tell me ${'everything '.repeat(12)}about the launch`;
    const title = titleFrom(long);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith('…')).toBe(true);
    expect(titleFrom('  short   one ')).toBe('short one');
  });

  it('keeps threads private to the user who had them', async () => {
    const { events } = await ask('What should I focus on today?');
    const id = threadOf(events).id;

    as('u_dana');
    const list = (await json<AssistantThreadSummary[]>('/assistant/threads')).data!;
    expect(list.map((t) => t.id)).not.toContain(id);
    expect((await json(`/assistant/threads/${id}`)).res.status).toBe(404);
    expect((await json(`/assistant/threads/${id}`, { method: 'DELETE' })).res.status).toBe(404);
    expect(
      (
        await json(`/assistant/threads/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: 'Mine now' }),
        })
      ).res.status,
    ).toBe(404);
    expect((await ask('Hello', id)).res.status).toBe(404);

    as('u_maya');
    expect((await json(`/assistant/threads/${id}`)).res.status).toBe(200);
  });

  it('persists what the user did with suggested tasks', async () => {
    const { events } = await ask('Turn the action items into tasks', undefined, {
      type: 'file',
      id: 'fl_pilot_kickoff',
      label: 'Supplier pilot kickoff notes',
    });
    const id = threadOf(events).id;
    const stored = (await json<AssistantThread>(`/assistant/threads/${id}`)).data!;
    const answer = stored.messages[1];
    expect(answer.actions?.length).toBeGreaterThan(0);
    expect(answer.actionsResult).toBeUndefined();

    const patch = await json(`/assistant/threads/${id}/messages/${answer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ actionsResult: { kind: 'dismissed' } }),
    });
    expect(patch.res.status).toBe(200);
    const reloaded = (await json<AssistantThread>(`/assistant/threads/${id}`)).data!;
    expect(reloaded.messages[1].actionsResult).toEqual({ kind: 'dismissed' });
    expect(reloaded.messages[1].actions).toEqual(answer.actions);

    const bad = await json(`/assistant/threads/${id}/messages/${answer.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ actionsResult: { kind: 'nope' } }),
    });
    expect(bad.res.status).toBe(400);
    const missing = await json(`/assistant/threads/${id}/messages/nope`, {
      method: 'PATCH',
      body: JSON.stringify({ actionsResult: { kind: 'dismissed' } }),
    });
    expect(missing.res.status).toBe(404);
  });

  it('renames, soft-deletes and restores', async () => {
    const id = threadOf((await ask('What should I focus on today?')).events).id;
    const renamed = await json<AssistantThread>(`/assistant/threads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Focus' }),
    });
    expect(renamed.data!.title).toBe('Focus');

    expect((await json(`/assistant/threads/${id}`, { method: 'DELETE' })).res.status).toBe(204);
    expect((await json(`/assistant/threads/${id}`)).res.status).toBe(404);
    const gone = (await json<AssistantThreadSummary[]>('/assistant/threads')).data!;
    expect(gone.map((t) => t.id)).not.toContain(id);

    expect((await json(`/assistant/threads/${id}/restore`, { method: 'POST' })).res.status).toBe(
      200,
    );
    const back = (await json<AssistantThreadSummary[]>('/assistant/threads')).data!;
    expect(back.map((t) => t.id)).toContain(id);
  });
});
