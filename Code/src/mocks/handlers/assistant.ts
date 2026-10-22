import { http, HttpResponse } from 'msw';
import type {
  ActionsResult,
  AssistantRequest,
  AssistantStreamEvent,
  AssistantThread,
  AssistantThreadSummary,
  User,
} from '@/domain/types';
import { answer, focus } from '../assistant/engine';
import { getDb, newId, save } from '../db';
import type { AssistantThreadRecord, Database } from '../db-types';
import { API, badRequest, body, getDemoSettings, notFound, now, route } from '../http';

/** Split into word-sized tokens, keeping citation tokens like [[task:t_1]] whole. */
const tokenize = (text: string) => text.match(/\[\[[^\]]+\]\]|\S+\s*|\s+/g) ?? [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TITLE_MAX = 60;

/** A thread title from the first question: one line, about 60 characters. */
export function titleFrom(question: string): string {
  const oneLine = question.replace(/\s+/g, ' ').trim();
  return oneLine.length <= TITLE_MAX ? oneLine : `${oneLine.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

/** The user's own live thread, or a 404. Other people's threads look like they don't exist. */
function ownThread(db: Database, user: User, id: string): AssistantThreadRecord {
  const thread = db.assistantThreads.find(
    (t) => t.id === id && t.userId === user.id && !t.deletedAt,
  );
  if (!thread) throw notFound('Conversation');
  return thread;
}

function toThread(t: AssistantThreadRecord): AssistantThread {
  return {
    id: t.id,
    title: t.title,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages,
  };
}

const isActionsResult = (v: unknown): v is ActionsResult => {
  const r = v as ActionsResult | null;
  if (!r || typeof r !== 'object') return false;
  if (r.kind === 'dismissed') return true;
  if (r.kind === 'undone') return typeof r.count === 'number';
  return r.kind === 'created' && Array.isArray(r.tasks);
};

export const assistantHandlers = [
  http.get(
    `${API}/assistant/focus`,
    route(({ db, user }) => focus(db, user)),
  ),

  /**
   * Streams the answer as text/event-stream: a thread event, then token events, then
   * citations, then (only when the assistant proposes tasks) actions, then done. The
   * question and answer are stored on the thread once the answer is complete.
   */
  http.post(
    `${API}/assistant/messages`,
    route(async ({ db, user, request }) => {
      const req = await body<AssistantRequest>(request);
      if (!req.message?.trim()) throw badRequest('Ask a question first');
      const existing = req.threadId ? ownThread(db, user, req.threadId) : null;
      const { text, citations, actions } = answer(db, user, req);

      let thread = existing;
      if (!thread) {
        const stamp = now();
        thread = {
          id: newId('th'),
          userId: user.id,
          title: titleFrom(req.message),
          createdAt: stamp,
          updatedAt: stamp,
          messages: [],
          deletedAt: null,
        };
        db.assistantThreads.push(thread);
      }
      const threadId = thread.id;

      // Pacing is for show; with simulated latency off, answer at once.
      const paced = getDemoSettings().latency !== 'none';
      const encoder = new TextEncoder();
      const send = (c: ReadableStreamDefaultController, e: AssistantStreamEvent) =>
        c.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

      const stream = new ReadableStream({
        async start(controller) {
          send(controller, { type: 'thread', id: threadId });
          if (paced) await sleep(450); // "thinking"
          for (const token of tokenize(text)) {
            send(controller, { type: 'token', text: token });
            if (paced) await sleep(token.startsWith('[[') ? 40 : 14 + Math.random() * 22);
          }
          send(controller, { type: 'citations', items: citations });
          if (actions.length) send(controller, { type: 'actions', items: actions });

          // Store the exchange, read fresh in case the database changed while streaming.
          const stored = getDb().assistantThreads.find((t) => t.id === threadId);
          const ids = { user: newId('m'), assistant: newId('m') };
          if (stored) {
            stored.messages.push(
              {
                id: ids.user,
                role: 'user',
                text: req.message.trim(),
                citations: [],
                context: req.context ?? null,
              },
              {
                id: ids.assistant,
                role: 'assistant',
                text,
                citations,
                context: req.context ?? null,
                ...(actions.length ? { actions } : {}),
              },
            );
            stored.updatedAt = now();
            save();
          }
          send(controller, { type: 'done', messageIds: ids });
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }),
  ),

  http.get(
    `${API}/assistant/threads`,
    route(({ db, user }): AssistantThreadSummary[] =>
      db.assistantThreads
        .filter((t) => t.userId === user.id && !t.deletedAt && t.messages.length > 0)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((t) => ({
          id: t.id,
          title: t.title,
          updatedAt: t.updatedAt,
          messageCount: t.messages.length,
        })),
    ),
  ),

  http.get(
    `${API}/assistant/threads/:id`,
    route(({ db, user, params }) => toThread(ownThread(db, user, String(params.id)))),
  ),

  http.patch(
    `${API}/assistant/threads/:id`,
    route(async ({ db, user, params, request }) => {
      const thread = ownThread(db, user, String(params.id));
      const { title } = await body<{ title?: string }>(request);
      if (typeof title !== 'string' || !title.trim())
        throw badRequest('Give the conversation a title');
      thread.title = titleFrom(title);
      return toThread(thread);
    }),
  ),

  /** Soft delete, so the Undo toast can bring it back. */
  http.delete(
    `${API}/assistant/threads/:id`,
    route(({ db, user, params }) => {
      ownThread(db, user, String(params.id)).deletedAt = now();
      return null;
    }),
  ),

  http.post(
    `${API}/assistant/threads/:id/restore`,
    route(({ db, user, params }) => {
      const thread = db.assistantThreads.find(
        (t) => t.id === String(params.id) && t.userId === user.id && t.deletedAt,
      );
      if (!thread) throw notFound('Conversation');
      thread.deletedAt = null;
      return toThread(thread);
    }),
  ),

  /** Remember what the user did with a message's suggested tasks. */
  http.patch(
    `${API}/assistant/threads/:id/messages/:messageId`,
    route(async ({ db, user, params, request }) => {
      const thread = ownThread(db, user, String(params.id));
      const message = thread.messages.find((m) => m.id === String(params.messageId));
      if (!message) throw notFound('Message');
      const { actionsResult } = await body<{ actionsResult?: unknown }>(request);
      if (!isActionsResult(actionsResult)) throw badRequest('Expected an actionsResult');
      message.actionsResult = actionsResult;
      return message;
    }),
  ),
];
