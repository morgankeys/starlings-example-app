import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Sparkles } from 'lucide-react';
import { assistantApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { usePanels } from '@/app/panels';
import { Button, ErrorState, Skeleton } from '@/components/ui';
import { StatusIcon } from '@/features/tasks/TaskIcons';
import { useAssistant } from './AssistantProvider';
import styles from './FocusCard.module.css';

/** Ask Birdy's pick of the three things to do first today. */
export function FocusCard() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: keys.focus,
    queryFn: assistantApi.focus,
  });
  const { openTask } = usePanels();
  const assistant = useAssistant();

  const followUp = () => {
    assistant.setOpen(true);
    assistant.ask('What should I focus on today?');
  };

  return (
    <section className={styles.card} data-component="FocusCard" aria-labelledby="focus-title">
      <header className={styles.header}>
        <span className={styles.badge}>
          <Sparkles aria-hidden />
        </span>
        <h2 id="focus-title" className={styles.title}>
          Your focus today
        </h2>
        <Button size="sm" variant="ghost" icon={<MessageCircle />} onClick={followUp}>
          Ask why
        </Button>
      </header>
      {isPending && <Skeleton lines={3} />}
      {error && <ErrorState error={error} onRetry={refetch} compact />}
      {data && (
        <>
          <p className={styles.headline}>{data.headline}</p>
          {data.items.length > 0 && (
            <ol className={styles.items}>
              {data.items.map(({ task, reason }, i) => (
                <li key={task.id}>
                  <button type="button" className={styles.item} onClick={() => openTask(task.id)}>
                    <span className={styles.number}>{i + 1}</span>
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>{task.title}</span>
                      <span className={styles.reason}>{reason}</span>
                    </span>
                    <StatusIcon status={task.status} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
