import { http, HttpResponse } from 'msw';
import type { AssistantRequest, AssistantStreamEvent } from '@/domain/types';
import { answer, focus } from '../assistant/engine';
import { API, badRequest, body, route } from '../http';

/** Split into word-sized tokens, keeping citation tokens like [[task:t_1]] whole. */
const tokenize = (text: string) => text.match(/\[\[[^\]]+\]\]|\S+\s*|\s+/g) ?? [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const assistantHandlers = [
  http.get(`${API}/assistant/focus`, route(({ db, user }) => focus(db, user))),

  /** Streams the answer as text/event-stream: token events, then citations, then done. */
  http.post(
    `${API}/assistant/messages`,
    route(async ({ db, user, request }) => {
      const req = await body<AssistantRequest>(request);
      if (!req.message?.trim()) throw badRequest('Ask a question first');
      const { text, citations } = answer(db, user, req);
      const encoder = new TextEncoder();
      const send = (c: ReadableStreamDefaultController, e: AssistantStreamEvent) =>
        c.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));

      const stream = new ReadableStream({
        async start(controller) {
          await sleep(450); // "thinking"
          for (const token of tokenize(text)) {
            send(controller, { type: 'token', text: token });
            await sleep(token.startsWith('[[') ? 40 : 14 + Math.random() * 22);
          }
          send(controller, { type: 'citations', items: citations });
          send(controller, { type: 'done' });
          controller.close();
        },
      });
      return new HttpResponse(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }),
  ),
];
