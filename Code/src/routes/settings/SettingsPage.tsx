import { Monitor, Moon, Sun } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/app/session';
import { useTheme } from '@/app/theme';
import { Avatar, Badge, Card, PageHeader, SegmentedControl, Tabs } from '@/components/ui';
import { MembersTab } from '@/features/org/MembersTab';
import { WorkspaceSettings } from '@/features/org/WorkspaceSettings';
import styles from './SettingsPage.module.css';

type Tab = 'profile' | 'workspace' | 'members';
const TABS: { value: Tab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'members', label: 'Members' },
];

export function SettingsPage() {
  const { user, org, teams } = useSession();
  const { preference, setTheme } = useTheme();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = TABS.find((t) => t.value === requested)?.value ?? 'profile';
  const setTab = (next: Tab) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'profile') out.delete('tab');
        else out.set('tab', next);
        return out;
      },
      { replace: true },
    );
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs label="Settings" value={tab} onChange={setTab} items={TABS}>
        {tab === 'profile' && (
          <div className={styles.stack}>
            <Card title="Profile">
              <div className={styles.profile}>
                <Avatar user={user} size="lg" />
                <dl className={styles.details}>
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                  <dt>Title</dt>
                  <dd>{user.title}</dd>
                  <dt>Role</dt>
                  <dd>
                    <Badge
                      tone={
                        user.role === 'admin'
                          ? 'info'
                          : user.role === 'guest'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {user.role === 'admin'
                        ? 'Workspace admin'
                        : user.role === 'guest'
                          ? 'Guest'
                          : 'Member'}
                    </Badge>
                  </dd>
                  <dt>Teams</dt>
                  <dd>{teams.map((t) => t.name).join(', ') || 'None'}</dd>
                </dl>
              </div>
              <p className={styles.note}>
                Profile details come from {org.name}’s directory. Ask a workspace admin to change
                them.
              </p>
            </Card>
            <Card title="Appearance">
              <div className={styles.row}>
                <div>
                  <p className={styles.label}>Theme</p>
                  <p className={styles.note}>
                    “System” follows your device’s light or dark setting.
                  </p>
                </div>
                <SegmentedControl
                  label="Theme"
                  value={preference}
                  onChange={setTheme}
                  options={[
                    { value: 'system', label: 'System', icon: <Monitor /> },
                    { value: 'light', label: 'Light', icon: <Sun /> },
                    { value: 'dark', label: 'Dark', icon: <Moon /> },
                  ]}
                />
              </div>
            </Card>
          </div>
        )}
        {tab === 'workspace' && (
          <div className={styles.stack}>
            <WorkspaceSettings org={org} canEdit={user.role === 'admin'} />
          </div>
        )}
        {tab === 'members' && <MembersTab me={user} org={org} />}
      </Tabs>
    </>
  );
}
