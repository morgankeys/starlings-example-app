import { PageHeader } from '@/components/ui';
import { useSession } from '@/app/session';
import { TasksView } from '@/features/tasks/TasksView';

export function MyTasksPage() {
  const { user } = useSession();
  return (
    <>
      <PageHeader
        title="My tasks"
        description="Everything assigned to you, across teams and projects."
      />
      <TasksView
        base={{ assignee: 'me' }}
        hideAssignee
        defaultGroup="due"
        canAdd={user.role !== 'guest'}
        emptyTitle="Nothing assigned to you"
      />
    </>
  );
}
