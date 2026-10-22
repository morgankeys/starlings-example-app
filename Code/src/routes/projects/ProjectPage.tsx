import { FolderOpen, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSession } from '@/app/session';
import { Button, Dot, ErrorState, LinkButton, PageHeader, Skeleton } from '@/components/ui';
import { useAssistant, useAssistantContext } from '@/features/assistant/AssistantProvider';
import { useProject, useTeams } from '@/features/org/api';
import { TasksView } from '@/features/tasks/TasksView';
import styles from './ProjectPage.module.css';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const { user } = useSession();
  const { data: project, error, isPending, refetch } = useProject(projectId);
  const { data: teams = [] } = useTeams();
  const assistant = useAssistant();
  useAssistantContext(project ? { type: 'project', id: project.id, label: project.name } : null);

  if (isPending) return <Skeleton lines={6} size="lg" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const team = teams.find((t) => t.id === project.teamId);
  return (
    <>
      <PageHeader
        eyebrow={
          <span className={styles.eyebrow}>
            <Dot color={project.color} /> Project{team ? ` · ${team.name}` : ''}
          </span>
        }
        title={project.name}
        description={project.description}
        actions={
          <>
            <Button
              variant="ai"
              icon={<Sparkles />}
              onClick={() =>
                assistant.askAbout(
                  { type: 'project', id: project.id, label: project.name },
                  'Is this project on track?',
                )
              }
            >
              Is it on track?
            </Button>
            {user.role !== 'guest' && (
              <LinkButton to={`/files/folders/${project.folderId}`} icon={<FolderOpen />}>
                Project files
              </LinkButton>
            )}
          </>
        }
      />
      <TasksView
        base={{ project: project.id }}
        quickAddDefaults={{ projectId: project.id, teamId: project.teamId }}
        hideProject
        canAdd={user.role !== 'guest'}
      />
    </>
  );
}
