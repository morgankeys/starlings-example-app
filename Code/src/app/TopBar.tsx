import {
  CheckSquare,
  FolderPlus,
  Menu as MenuIcon,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Button, IconButton, Kbd, Menu, MenuItem } from '@/components/ui';
import { useAssistant } from '@/features/assistant/AssistantProvider';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useSession } from './session';
import { useShellActions } from './shellActions';
import styles from './TopBar.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? '⌘' : 'Ctrl ';

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { user } = useSession();
  const actions = useShellActions();
  const assistant = useAssistant();
  return (
    <header className={styles.bar}>
      <span className={styles.navButton}>
        <IconButton label="Open menu" icon={<MenuIcon />} onClick={onOpenNav} />
      </span>
      <button type="button" className={styles.search} onClick={actions.openSearch}>
        <Search aria-hidden />
        <span className={styles.searchLabel}>Search tasks, files, people…</span>
        <Kbd>{`${MOD}K`}</Kbd>
      </button>
      <div className={styles.actions}>
        <NotificationBell />
        {user.role !== 'guest' && (
          <Menu
            align="end"
            trigger={
              <Button variant="secondary" icon={<Plus />}>
                New
              </Button>
            }
          >
            <MenuItem icon={<CheckSquare />} onSelect={() => actions.newTask()}>
              Task
            </MenuItem>
            <MenuItem icon={<FolderPlus />} onSelect={actions.newFolder}>
              Folder
            </MenuItem>
            <MenuItem icon={<Upload />} onSelect={actions.upload}>
              Upload file
            </MenuItem>
          </Menu>
        )}
        <Button
          variant="ai"
          icon={<Sparkles />}
          aria-pressed={assistant.open}
          onClick={assistant.toggle}
          title={`Ask Birdy (${MOD}J)`}
        >
          Ask Birdy
        </Button>
      </div>
    </header>
  );
}
