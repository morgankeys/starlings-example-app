import {
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  FileText,
  Folder,
  History,
  Plus,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MOD } from '@/app/TopBar';
import { IconButton, SidePanel, Spinner, useToast } from '@/components/ui';
import type { AssistantContext } from '@/domain/types';
import { useAssistant } from './AssistantProvider';
import { MessageContent } from './MessageContent';
import { SuggestedTasks } from './SuggestedTasks';
import { ThreadHistory } from './ThreadHistory';
import styles from './AssistantPanel.module.css';

const CONTEXT_ICON = {
  file: FileText,
  task: CheckSquare,
  team: Users,
  project: Folder,
  person: User,
};

function suggestions(context: AssistantContext | null): string[] {
  switch (context?.type) {
    case 'file':
      return [
        'Summarize this file',
        'What decisions and action items does it record?',
        'Turn the action items into tasks',
        'Which tasks use this file?',
      ];
    case 'task':
      return [
        'What’s blocking this?',
        'Summarize this task',
        'Find related files',
        'Create a follow-up task',
      ];
    case 'team':
      return [
        'Who’s overloaded this week?',
        'What’s overdue for this team?',
        'What’s due this week?',
      ];
    case 'project':
      return ['Is this project on track?', 'What’s overdue?', 'What’s blocked?'];
    case 'person':
      return [`What is ${context.label.split(' ')[0]} working on this week?`, 'What’s overdue?'];
    default:
      return [
        'What should I focus on today?',
        'What’s overdue across my teams?',
        'What’s blocked right now?',
        'Find files about checkout',
      ];
  }
}

export function AssistantPanel() {
  const {
    messages,
    threadId,
    context,
    busy,
    ask,
    resolveActions,
    clearContext,
    newThread,
    openThread,
    setOpen,
  } = useAssistant();
  const toast = useToast();
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || busy) return;
    ask(draft);
    setDraft('');
  };

  const backToChat = useCallback(() => {
    setView('chat');
    // The history list is about to unmount; put focus back where typing happens.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const open = (id: string) =>
    openThread(id).then(backToChat, (err: Error) =>
      toast({ title: "Couldn't open the conversation", description: err.message, tone: 'danger' }),
    );

  const ContextIcon = context ? CONTEXT_ICON[context.type] : null;

  return (
    <SidePanel
      label="Ask Birdy"
      width="assistant"
      onClose={() => setOpen(false)}
      onEscape={view === 'history' ? backToChat : undefined}
      title={
        <span className={styles.title}>
          <Sparkles aria-hidden /> Ask Birdy
        </span>
      }
      actions={
        view === 'history' ? (
          <IconButton label="Back to chat" icon={<ArrowLeft />} onClick={backToChat} />
        ) : (
          <>
            {messages.length > 0 && (
              <IconButton label="New conversation" icon={<Plus />} onClick={newThread} />
            )}
            <IconButton label="History" icon={<History />} onClick={() => setView('history')} />
          </>
        )
      }
      footer={
        view === 'history' ? undefined : (
          <form className={styles.composer} onSubmit={submit}>
            {context && ContextIcon && (
              <div className={styles.context}>
                <span className={styles.contextLabel}>About</span>
                <span className={styles.contextChip}>
                  <ContextIcon aria-hidden />
                  <span className={styles.contextText}>{context.label}</span>
                  <button
                    type="button"
                    className={styles.contextClear}
                    aria-label="Ask about everything instead"
                    onClick={clearContext}
                  >
                    <X aria-hidden />
                  </button>
                </span>
              </div>
            )}
            <div className={styles.inputRow}>
              <textarea
                ref={inputRef}
                className={styles.input}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  context
                    ? `Ask about ${context.label}…`
                    : 'Ask about your tasks, files and priorities…'
                }
                aria-label="Ask Birdy a question"
              />
              <IconButton
                type="submit"
                label="Send"
                icon={<ArrowUp />}
                variant="secondary"
                disabled={!draft.trim() || busy}
                noTooltip
              />
            </div>
            <p className={styles.disclaimer}>
              Answers come from your workspace in Birdy. {MOD}J to toggle.
            </p>
          </form>
        )
      }
    >
      {view === 'history' ? (
        <div className={styles.scroll}>
          <ThreadHistory currentId={threadId} onOpen={open} onDeleted={newThread} />
        </div>
      ) : (
        <div ref={scrollRef} className={styles.scroll} aria-live="polite">
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <span className={styles.welcomeIcon}>
                <Sparkles aria-hidden />
              </span>
              <h2 className={styles.welcomeTitle}>What can I help with?</h2>
              <p className={styles.welcomeText}>
                I can see the tasks and files you have access to. Try one of these:
              </p>
              <ul className={styles.suggestions}>
                {suggestions(context).map((s) => (
                  <li key={s}>
                    <button type="button" className={styles.suggestion} onClick={() => ask(s)}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className={styles.messages}>
              {messages.map((m) => (
                <li key={m.id} className={styles.message} data-role={m.role} data-status={m.status}>
                  {m.role === 'user' ? (
                    <p className={styles.bubble}>{m.text}</p>
                  ) : m.status === 'streaming' && !m.text ? (
                    <span className={styles.thinking}>
                      <Spinner size="sm" /> Looking through your workspace…
                    </span>
                  ) : (
                    <>
                      <MessageContent text={m.text} citations={m.citations} />
                      {m.status === 'done' && m.actions.length > 0 && (
                        <div className={styles.actions}>
                          <SuggestedTasks
                            items={m.actions}
                            resolution={m.actionsResult}
                            onResolve={(result) => resolveActions(m.id, result)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </SidePanel>
  );
}
