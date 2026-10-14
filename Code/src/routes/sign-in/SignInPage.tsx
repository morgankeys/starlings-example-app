import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sessionApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { useSignIn } from '@/app/session';
import { Logo } from '@/components/brand/Logo';
import { Avatar, Button, ErrorState, Field, Input, Skeleton } from '@/components/ui';
import type { User } from '@/domain/types';
import styles from './SignInPage.module.css';

const FEATURED = ['u_maya', 'u_julia', 'u_raj', 'u_dana', 'u_elena'];

function roleLabel(u: User) {
  if (u.role === 'admin') return 'Workspace admin';
  if (u.role === 'guest') return `Guest from ${u.company}`;
  return u.title;
}

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const { data, error, refetch, isPending } = useQuery({
    queryKey: keys.signInPeople,
    queryFn: sessionApi.people,
  });
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [showAll, setShowAll] = useState(false);

  const go = (userId: string) =>
    signIn.mutate(userId, { onSuccess: () => navigate(from, { replace: true }) });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const match = data?.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!match) {
      setEmailError("We couldn't find that email in this workspace. Pick a person below instead.");
      return;
    }
    go(match.id);
  };

  const people = data?.users ?? [];
  const shown = showAll ? people : people.filter((u) => FEATURED.includes(u.id));

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Logo size="lg" withWordmark />
        <div className={styles.heading}>
          <h1 className={styles.title}>Sign in to {data?.org.name ?? 'your workspace'}</h1>
          <p className={styles.subtitle}>
            This is a prototype, so there are no passwords. Pick who you want to be.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <Field label="Work email" error={emailError}>
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="email"
                placeholder="maya@meridianoutdoor.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(undefined);
                }}
              />
            )}
          </Field>
          <Button
            type="submit"
            variant="primary"
            trailingIcon={<ArrowRight />}
            loading={signIn.isPending}
          >
            Continue
          </Button>
        </form>

        <div className={styles.divider}>
          <span>or continue as</span>
        </div>

        {isPending && <Skeleton lines={4} size="lg" />}
        {error && <ErrorState error={error} onRetry={refetch} compact />}
        {data && (
          <ul className={styles.people}>
            {shown.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className={styles.person}
                  onClick={() => go(u.id)}
                  disabled={signIn.isPending}
                >
                  <Avatar user={u} size="md" />
                  <span className={styles.personText}>
                    <span className={styles.personName}>{u.name}</span>
                    <span className={styles.personRole}>{roleLabel(u)}</span>
                  </span>
                  <ArrowRight className={styles.personArrow} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {data && !showAll && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
            Show all {people.length} people
          </Button>
        )}
      </div>
    </main>
  );
}
