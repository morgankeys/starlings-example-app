import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { buildUrl } from '@/api/client';
import type {
  AssistantContext,
  AssistantStreamEvent,
  Citation,
  SuggestedTask,
} from '@/domain/types';

/** What the user did with a message's suggested tasks. */
export type ActionsResult =
  | { kind: 'created'; tasks: Array<{ id: string; title: string }> }
  | { kind: 'undone'; count: number }
  | { kind: 'dismissed' };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations: Citation[];
  /** Tasks the assistant proposes; the user confirms them before anything is created. */
  actions: SuggestedTask[];
  /** Set once the user has created or dismissed `actions`, so reopening the panel remembers. */
  actionsResult?: ActionsResult;
  context: AssistantContext | null;
  status: 'streaming' | 'done' | 'error';
}

interface AssistantState {
  open: boolean;
  messages: ChatMessage[];
  context: AssistantContext | null;
  busy: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  ask: (question: string) => void;
  /** Record what the user did with a message's suggested tasks. */
  resolveActions: (messageId: string, result: ActionsResult) => void;
  /** Open the panel scoped to something, optionally asking right away. */
  askAbout: (context: AssistantContext, question?: string) => void;
  clearContext: () => void;
  newThread: () => void;
  registerContext: (slot: 'page' | 'panel', context: AssistantContext | null) => void;
}

const Ctx = createContext<AssistantState | null>(null);

export function useAssistant() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAssistant must be used inside <AssistantProvider>');
  return ctx;
}

/** Tell Ask Birdy what the user is looking at. Panels (task, file) win over pages. */
export function useAssistantContext(
  context: AssistantContext | null,
  slot: 'page' | 'panel' = 'page',
) {
  const { registerContext } = useAssistant();
  // Callers pass a fresh object each render; re-register only when its identity changes.
  const latest = useRef(context);
  latest.current = context;
  const key = context ? `${context.type}:${context.id}:${context.label}` : '';
  useEffect(() => {
    registerContext(slot, latest.current);
    return () => registerContext(slot, null);
  }, [key, slot, registerContext]);
}

const newId = () => Math.random().toString(36).slice(2);

async function* readEvents(res: Response): AsyncGenerator<AssistantStreamEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (line) yield JSON.parse(line.slice(6)) as AssistantStreamEvent;
    }
  }
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slots, setSlots] = useState<{
    page: AssistantContext | null;
    panel: AssistantContext | null;
  }>({ page: null, panel: null });
  const [override, setOverride] = useState<AssistantContext | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ambient = slots.panel ?? slots.page;
  const ambientKey = ambient ? `${ambient.type}:${ambient.id}` : null;
  const context = override ?? (ambientKey && ambientKey === dismissedKey ? null : ambient);
  const busy = messages.some((m) => m.status === 'streaming');

  const registerContext = useCallback((slot: 'page' | 'panel', c: AssistantContext | null) => {
    setSlots((s) => ({ ...s, [slot]: c }));
  }, []);

  // A new page or panel replaces an explicit "ask about" scope.
  useEffect(() => setOverride(null), [ambientKey]);

  const patch = (id: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((all) => all.map((m) => (m.id === id ? fn(m) : m)));

  const send = useCallback(async (question: string, scope: AssistantContext | null) => {
    const q = question.trim();
    if (!q) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const answerId = newId();
    setMessages((all) => [
      ...all,
      {
        id: newId(),
        role: 'user',
        text: q,
        citations: [],
        actions: [],
        context: scope,
        status: 'done',
      },
      {
        id: answerId,
        role: 'assistant',
        text: '',
        citations: [],
        actions: [],
        context: scope,
        status: 'streaming',
      },
    ]);
    try {
      const res = await fetch(buildUrl('/assistant/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, context: scope }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Ask Birdy is unavailable right now.');
      }
      for await (const event of readEvents(res)) {
        if (event.type === 'token') patch(answerId, (m) => ({ ...m, text: m.text + event.text }));
        else if (event.type === 'citations')
          patch(answerId, (m) => ({ ...m, citations: event.items }));
        else if (event.type === 'actions') patch(answerId, (m) => ({ ...m, actions: event.items }));
        else if (event.type === 'error') throw new Error(event.message);
      }
      patch(answerId, (m) => ({ ...m, status: 'done' }));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      patch(answerId, (m) => ({ ...m, status: 'error', text: (err as Error).message }));
    }
  }, []);

  const value = useMemo<AssistantState>(
    () => ({
      open,
      messages,
      context,
      busy,
      setOpen,
      toggle: () => setOpen((o) => !o),
      ask: (q) => send(q, context),
      resolveActions: (messageId, result) =>
        setMessages((all) =>
          all.map((m) => (m.id === messageId ? { ...m, actionsResult: result } : m)),
        ),
      askAbout: (c, q) => {
        setOverride(c);
        setDismissedKey(null);
        setOpen(true);
        if (q) send(q, c);
      },
      clearContext: () => {
        setOverride(null);
        setDismissedKey(ambientKey);
      },
      newThread: () => {
        abortRef.current?.abort();
        setMessages([]);
      },
      registerContext,
    }),
    [open, messages, context, busy, send, ambientKey, registerContext],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
