import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { sessionApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import { Spinner } from '@/components/ui';
import type { Session } from '@/domain/types';
import styles from './session.module.css';

const SessionContext = createContext<Session | null>(null);

/** The signed-in user, org and teams. Only usable inside <RequireSession>. */
export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside <RequireSession>');
  return s;
}

export function useSessionQuery() {
  return useQuery({
    queryKey: keys.session,
    queryFn: sessionApi.get,
    retry: false,
    staleTime: Infinity,
  });
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { data, error, isPending } = useSessionQuery();
  const location = useLocation();
  if (isPending) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" label="Loading Birdy" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!data) {
    return (
      <div className={styles.loading}>
        <p>Birdy couldn't start. {error instanceof Error ? error.message : ''}</p>
      </div>
    );
  }
  return <SessionContext.Provider value={data}>{children}</SessionContext.Provider>;
}

/** Sign in as someone (the prototype has no passwords). Clears every cached query. */
export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionApi.signIn,
    onSuccess: (session) => {
      qc.clear();
      qc.setQueryData(keys.session, session);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sessionApi.signOut,
    onSuccess: () => qc.clear(),
  });
}
