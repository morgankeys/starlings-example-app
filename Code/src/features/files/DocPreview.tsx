import type { ReactNode } from 'react';
import styles from './DocPreview.module.css';

/** Renders a file's text (headings, paragraphs, bullets) as a read-only page preview. */
export function DocPreview({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {bullets.map((b, i) => (
            <li key={i}>{decorate(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('- ')) return bullets.push(line.slice(2));
    flush();
    if (!line) return;
    if (line.startsWith('## ')) blocks.push(<h3 key={i}>{line.slice(3)}</h3>);
    else if (line.startsWith('# ')) blocks.push(<h2 key={i}>{line.slice(2)}</h2>);
    else if (/^\d+\. /.test(line))
      blocks.push(
        <p key={i} className={styles.numbered}>
          {line}
        </p>,
      );
    else blocks.push(<p key={i}>{line}</p>);
  });
  flush();
  return (
    <article className={styles.doc} data-component="DocPreview">
      {blocks}
    </article>
  );
}

/** Highlight "Decision:" and "Action:" lead-ins. */
function decorate(text: string): ReactNode {
  const m = text.match(/^(Decision|Action):\s*(.*)$/i);
  if (!m) return text;
  return (
    <>
      <strong className={styles.lead} data-kind={m[1].toLowerCase()}>
        {m[1]}:
      </strong>{' '}
      {m[2]}
    </>
  );
}
