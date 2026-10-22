import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui';
import type { NewTask } from '@/domain/types';
import { AssistantPanel } from '@/features/assistant/AssistantPanel';
import { AssistantProvider, useAssistant } from '@/features/assistant/AssistantProvider';
import { useFileMutations } from '@/features/files/api';
import { FilePanel } from '@/features/files/FilePanel';
import { NewFolderDialog } from '@/features/files/FolderDialogs';
import { CommandPalette } from '@/features/search/CommandPalette';
import { NewTaskDialog } from '@/features/tasks/NewTaskDialog';
import { TaskPanel } from '@/features/tasks/TaskPanel';
import { usePanels } from './panels';
import { ShellActionsContext, type ShellActions } from './shellActions';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

const ROOT_FOLDER = 'fd_root';

export function AppShell() {
  return (
    <AssistantProvider>
      <Shell />
    </AssistantProvider>
  );
}

function Shell() {
  const panels = usePanels();
  const assistant = useAssistant();
  const toast = useToast();
  const location = useLocation();
  const { upload } = useFileMutations();
  const [newTask, setNewTask] = useState<Partial<NewTask> | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setNavOpen(false), [location.pathname]);

  // ⌘K search, ⌘J Ask Birdy
  const { toggle } = assistant;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === 'j') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const targetFolder = currentFolder ?? ROOT_FOLDER;
  const actions = useMemo<ShellActions>(
    () => ({
      newTask: (defaults) => setNewTask(defaults ?? {}),
      newFolder: () => setNewFolderOpen(true),
      upload: () => fileInput.current?.click(),
      openSearch: () => setSearchOpen(true),
      setCurrentFolder,
    }),
    [],
  );

  const onFilesChosen = useCallback(
    (list: FileList | null) => {
      for (const file of Array.from(list ?? [])) {
        upload.mutate(
          { folderId: targetFolder, file: { name: file.name, size: file.size } },
          {
            onSuccess: () => toast({ title: `Uploaded ${file.name}`, tone: 'success' }),
            onError: (err) =>
              toast({
                title: `Couldn't upload ${file.name}`,
                description: err.message,
                tone: 'danger',
              }),
          },
        );
      }
      if (fileInput.current) fileInput.current.value = '';
    },
    [upload, targetFolder, toast],
  );

  return (
    <ShellActionsContext.Provider value={actions}>
      <div
        className={styles.shell}
        data-nav-open={navOpen}
        data-stacked={!!(panels.taskId || panels.fileId) && assistant.open}
      >
        <Sidebar onClose={() => setNavOpen(false)} />
        <div className={styles.main}>
          <TopBar onOpenNav={() => setNavOpen(true)} />
          <main className={styles.content} id="main">
            <Outlet />
          </main>
        </div>
        {panels.taskId && <TaskPanel key={panels.taskId} taskId={panels.taskId} />}
        {panels.fileId && <FilePanel key={panels.fileId} fileId={panels.fileId} />}
        {assistant.open && <AssistantPanel />}
      </div>

      <NewTaskDialog defaults={newTask} onClose={() => setNewTask(null)} />
      <NewFolderDialog
        open={newFolderOpen}
        parentId={targetFolder}
        onClose={() => setNewFolderOpen(false)}
      />
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => onFilesChosen(e.target.files)}
      />
    </ShellActionsContext.Provider>
  );
}
