import {
  CheckSquare,
  ChevronsUpDown,
  FolderClosed,
  Home,
  LogOut,
  Moon,
  Settings,
  Share2,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar, Dot, IconButton, Menu, MenuItem, MenuSeparator } from '@/components/ui';
import { useProjects, useTeams } from '@/features/org/api';
import { useTasks } from '@/features/tasks/api';
import { DemoPanel } from './DemoPanel';
import { useSession, useSignOut } from './session';
import { useTheme } from './theme';
import styles from './Sidebar.module.css';

function NavItem({
  to,
  icon,
  label,
  count,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className={styles.item}>
      {icon}
      <span className={styles.itemLabel}>{label}</span>
      {!!count && <span className={styles.count}>{count}</span>}
    </NavLink>
  );
}

export function Sidebar({ onClose }: { onClose: () => void }) {
  const { user, org } = useSession();
  const isGuest = user.role === 'guest';
  const { data: myTeams } = useTeams(true);
  const { data: projects } = useProjects();
  const { data: myOpen } = useTasks({ assignee: 'me', includeDone: false });
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { toggle } = useTheme();

  return (
    <nav className={styles.sidebar} aria-label="Main">
      <div className={styles.workspace}>
        <Logo />
        <div className={styles.workspaceText}>
          <span className={styles.orgName}>{org.name}</span>
          <span className={styles.plan}>Birdy {org.plan}</span>
        </div>
        <span className={styles.closeNav}>
          <IconButton label="Close menu" icon={<X />} size="sm" onClick={onClose} />
        </span>
      </div>

      <div className={styles.scroll}>
        <div className={styles.group}>
          <NavItem to="/" end icon={<Home />} label="Home" />
          <NavItem to="/tasks" icon={<CheckSquare />} label="My tasks" count={myOpen?.length} />
          {!isGuest && <NavItem to="/files" end icon={<FolderClosed />} label="Files" />}
          <NavItem to="/files/shared" icon={<Share2 />} label="Shared with me" />
          {!isGuest && <NavItem to="/people" icon={<Users />} label="People" />}
        </div>

        {!isGuest && (
          <div className={styles.group}>
            <Link to="/teams" className={styles.heading}>
              Teams
            </Link>
            {myTeams?.map((t) => (
              <NavLink key={t.id} to={`/teams/${t.id}`} className={styles.item}>
                <Dot color={t.color} />
                <span className={styles.itemLabel}>{t.name}</span>
              </NavLink>
            ))}
            {myTeams?.length === 0 && <p className={styles.empty}>You're not on a team yet.</p>}
          </div>
        )}

        {!!projects?.length && (
          <div className={styles.group}>
            <Link to="/projects" className={styles.heading}>
              Projects
            </Link>
            {projects.map((p) => (
              <NavLink key={p.id} to={`/projects/${p.id}`} className={styles.item}>
                <Dot color={p.color} />
                <span className={styles.itemLabel}>{p.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <div className={styles.demo}>
        <DemoPanel />
      </div>

      <Menu
        align="start"
        trigger={
          <button type="button" className={styles.user}>
            <Avatar user={user} size="md" />
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userTitle}>
                {isGuest ? `Guest · ${user.company}` : user.title}
              </span>
            </span>
            <ChevronsUpDown className={styles.userChevron} aria-hidden />
          </button>
        }
      >
        <MenuItem icon={<User />} onSelect={() => navigate(`/people/${user.id}`)}>
          Your profile
        </MenuItem>
        <MenuItem icon={<Settings />} onSelect={() => navigate('/settings')}>
          Settings
        </MenuItem>
        <MenuItem icon={<ThemeIcon />} onSelect={toggle}>
          Switch theme
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<LogOut />}
          onSelect={() => signOut.mutate(undefined, { onSuccess: () => navigate('/sign-in') })}
        >
          Sign out
        </MenuItem>
      </Menu>
    </nav>
  );
}

function ThemeIcon() {
  const { preference } = useTheme();
  return preference === 'dark' ? <Sun /> : <Moon />;
}
