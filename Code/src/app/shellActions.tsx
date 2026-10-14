import { createContext, useContext, useEffect } from 'react';
import type { NewTask } from '@/domain/types';

export interface ShellActions {
  /** Open the New task dialog, optionally prefilled. */
  newTask: (defaults?: Partial<NewTask>) => void;
  /** Open the New folder dialog in the current folder (or All files). */
  newFolder: () => void;
  /** Pick a file to upload into the current folder (or All files). */
  upload: () => void;
  openSearch: () => void;
  /** Files pages tell the shell which folder "New folder" and "Upload" target. */
  setCurrentFolder: (id: string | null) => void;
}

export const ShellActionsContext = createContext<ShellActions | null>(null);

export function useShellActions() {
  const ctx = useContext(ShellActionsContext);
  if (!ctx) throw new Error('useShellActions must be used inside <AppShell>');
  return ctx;
}

export function useCurrentFolder(id: string | null) {
  const { setCurrentFolder } = useShellActions();
  useEffect(() => {
    setCurrentFolder(id);
    return () => setCurrentFolder(null);
  }, [id, setCurrentFolder]);
}
