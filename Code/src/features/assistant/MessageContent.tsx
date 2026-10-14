import { CheckSquare, FileText, Folder, User as UserIcon, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanels } from '@/app/panels';
import type { Citation } from '@/domain/types';
import styles from './MessageContent.module.css';

const ICONS = { task: CheckSquare, file: FileText, user: UserIcon, team: Users, project: Folder };

/**
 * Renders an assistant answer: paragraphs, "- " and "1. " lists, **bold**, and citation
 * tokens ([[task:id]]) as chips that open the cited item.
 */
export function MessageContent({ text, citations }: { text: string; citations: Citation[] }) {
  const { openTask, openFile } = usePanels();
  const navigate = useNavigate();
  const byKey = new Map(citations.map((c) => [`${c.type}:${c.id}`, c]));

  const open = (c: Citation) => {
    if (c.type === 'task') openTask(c.id);
    else if (c.type === 'file') openFile(c.id);
    else if (c.type === 'user') navigate(`/people/${c.id}`);
    else if (c.type === 'team') navigate(`/teams/${c.id}`);
    else navigate(`/projects/${c.id}`);
  };

  const inline = (line: string, key: string): ReactNode[] =>
    line.split(/(\[\[[a-z]+:[^\]]+\]\]|\*\*[^*]+\*\*)/g).map((part, i) => {
      const cite = part.match(/^\[\[([a-z]+):([^\]]+)\]\]$/);
      if (cite) {
        const c = byKey.get(`${cite[1]}:${cite[2]}`);
        // Citations arrive after the text; until then, show a quiet placeholder.
        if (!c) return <span key={`${key}-${i}`} className={styles.pending} aria-hidden />;
        const Icon = ICONS[c.type];
        return (
          <button
            key={`${key}-${i}`}
            type="button"
            className={styles.chip}
            data-type={c.type}
            onClick={() => open(c)}
          >
            <Icon aria-hidden />
            <span className={styles.chipText}>{c.title}</span>
          </button>
        );
      }
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return <strong key={`${key}-${i}`}>{bold[1]}</strong>;
      return part;
    });

  // Split each block into runs of list lines ("- ", "1. ", indented continuations) and
  // plain lines, so a bold heading line can sit directly above its list.
  const blocks: ReactNode[] = [];
  const isListLine = (l: string) => /^(- |\d+\. | {2})/.test(l);
  text.split(/\n{2,}/).forEach((block, b) => {
    const runs: Array<{ list: boolean; lines: string[] }> = [];
    for (const line of block.split('\n')) {
      const list =
        isListLine(line) && (!line.startsWith('  ') || runs[runs.length - 1]?.list === true);
      const last = runs[runs.length - 1];
      if (last && last.list === list) last.lines.push(line);
      else runs.push({ list, lines: [line] });
    }
    runs.forEach((run, r) => {
      const key = `${b}-${r}`;
      if (run.list) {
        const ordered = /^\d+\. /.test(run.lines[0]);
        const items: string[][] = [];
        for (const l of run.lines) {
          if (l.startsWith('  ') && items.length) items[items.length - 1].push(l.trim());
          else items.push([l.replace(/^(- |\d+\. )/, '')]);
        }
        const List = ordered ? 'ol' : 'ul';
        blocks.push(
          <List key={key} className={styles.list}>
            {items.map((item, i) => (
              <li key={i}>
                {inline(item[0], `${key}-${i}`)}
                {item.slice(1).map((sub, j) => (
                  <div key={j} className={styles.sub}>
                    {inline(sub, `${key}-${i}-${j}`)}
                  </div>
                ))}
              </li>
            ))}
          </List>,
        );
      } else {
        blocks.push(
          <p key={key} className={styles.paragraph}>
            {run.lines.map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {inline(l, `${key}-${i}`)}
              </span>
            ))}
          </p>,
        );
      }
    });
  });
  return <div className={styles.content}>{blocks}</div>;
}
