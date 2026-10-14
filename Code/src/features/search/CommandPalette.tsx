import * as RadixDialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import {
  CheckSquare,
  FileText,
  Folder,
  FolderKanban,
  Home,
  Moon,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { usePanels } from '@/app/panels';
import { useSession } from '@/app/session';
import { useShellActions } from '@/app/shellActions';
import { useTheme } from '@/app/theme';
import { Kbd, Spinner } from '@/components/ui';
import type { SearchResult } from '@/domain/types';
import { useAssistant } from '@/features/assistant/AssistantProvider';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  group: string;
  run: () => void;
}

const RESULT_ICON: Record<SearchResult['type'], LucideIcon> = {
  task: CheckSquare,
  file: FileText,
  folder: Folder,
  user: User,
  team: Users,
  project: FolderKanban,
};
const RESULT_GROUP: Record<SearchResult['type'], string> = {
  task: 'Tasks',
  file: 'Files',
  folder: 'Folders',
  user: 'People',
  team: 'Teams',
  project: 'Projects',
};

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** ⌘K: search everything you can see, or jump to an action. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const debounced = useDebounced(q.trim(), 150);
  const navigate = useNavigate();
  const { openTask, openFile } = usePanels();
  const { user } = useSession();
  const shell = useShellActions();
  const assistant = useAssistant();
  const { toggle } = useTheme();

  const { data: results, isFetching } = useQuery({
    queryKey: keys.search(debounced),
    queryFn: ({ signal }) => searchApi.search(debounced, signal),
    enabled: open && debounced.length > 1,
    placeholderData: (prev) => prev,
  });

  const close = () => {
    onOpenChange(false);
    setQ('');
    setActive(0);
  };

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path);
    const actions: Command[] = [
      { id: 'home', label: 'Go to Home', icon: Home, group: 'Go to', run: go('/') },
      {
        id: 'tasks',
        label: 'Go to My tasks',
        icon: CheckSquare,
        group: 'Go to',
        run: go('/tasks'),
      },
      {
        id: 'files',
        label: 'Go to Files',
        icon: Folder,
        group: 'Go to',
        run: go(user.role === 'guest' ? '/files/shared' : '/files'),
      },
      { id: 'people', label: 'Go to People', icon: Users, group: 'Go to', run: go('/people') },
      {
        id: 'ask',
        label: 'Ask Birdy',
        hint: 'AI',
        icon: Sparkles,
        group: 'Actions',
        run: () => assistant.setOpen(true),
      },
      {
        id: 'theme',
        label: 'Switch light or dark theme',
        icon: Moon,
        group: 'Actions',
        run: toggle,
      },
    ];
    if (user.role !== 'guest')
      actions.splice(4, 0, {
        id: 'new-task',
        label: 'Create a task',
        icon: Plus,
        group: 'Actions',
        run: () => shell.newTask(),
      });

    if (debounced.length > 1) {
      const found: Command[] = (results ?? []).map((r) => ({
        id: `${r.type}:${r.id}`,
        label: r.title,
        hint: r.subtitle,
        icon: RESULT_ICON[r.type],
        group: RESULT_GROUP[r.type],
        run: () => {
          if (r.type === 'task') openTask(r.id);
          else if (r.type === 'file') openFile(r.id);
          else if (r.type === 'folder') navigate(`/files/folders/${r.id}`);
          else if (r.type === 'user') navigate(`/people/${r.id}`);
          else if (r.type === 'team') navigate(`/teams/${r.id}`);
          else navigate(`/projects/${r.id}`);
        },
      }));
      const askCmd: Command = {
        id: 'ask-q',
        label: `Ask Birdy: “${debounced}”`,
        icon: Sparkles,
        group: 'Ask Birdy',
        run: () => {
          assistant.setOpen(true);
          assistant.ask(debounced);
        },
      };
      const matchingActions = actions.filter((a) =>
        a.label.toLowerCase().includes(debounced.toLowerCase()),
      );
      return [...found, ...matchingActions, askCmd];
    }
    return actions;
  }, [debounced, results, navigate, openTask, openFile, user.role, assistant, toggle, shell]);

  useEffect(() => setActive(0), [debounced, results]);

  const run = (c: Command) => {
    close();
    c.run();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && commands[active]) {
      e.preventDefault();
      run(commands[active]);
    }
  };

  useEffect(() => {
    document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  let lastGroup = '';
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={styles.content}
          data-component="CommandPalette"
          aria-describedby={undefined}
        >
          <RadixDialog.Title className={styles.srOnly}>Search Birdy</RadixDialog.Title>
          <div className={styles.inputRow}>
            <Search aria-hidden />
            <input
              className={styles.input}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search tasks, files, people… or type a question"
              role="combobox"
              aria-expanded
              aria-controls="cmd-list"
              aria-activedescendant={commands[active] ? `cmd-${active}` : undefined}
              aria-label="Search"
            />
            {isFetching && <Spinner size="sm" />}
            <Kbd>Esc</Kbd>
          </div>
          <ul id="cmd-list" role="listbox" className={styles.list} aria-label="Results">
            {debounced.length > 1 && !isFetching && results?.length === 0 && (
              <li className={styles.empty}>No matches. Ask Birdy instead.</li>
            )}
            {commands.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              const Icon = c.icon;
              return (
                <li key={c.id} role="presentation">
                  {header && <div className={styles.group}>{header}</div>}
                  <div
                    id={`cmd-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={styles.item}
                    onMouseMove={() => setActive(i)}
                    onClick={() => run(c)}
                  >
                    <Icon className={styles.icon} aria-hidden />
                    <span className={styles.label}>{c.label}</span>
                    {c.hint && <span className={styles.hint}>{c.hint}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
