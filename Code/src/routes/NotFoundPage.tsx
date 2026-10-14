import { Compass } from 'lucide-react';
import { EmptyState, LinkButton } from '@/components/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass />}
      title="We couldn’t find that page"
      description="It may have moved, or you may not have access to it."
      action={
        <LinkButton to="/" variant="primary">
          Go to Home
        </LinkButton>
      }
    />
  );
}
