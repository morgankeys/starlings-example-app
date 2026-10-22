import { Monitor, Moon, Sun } from 'lucide-react';
import { useSession } from '@/app/session';
import { useTheme } from '@/app/theme';
import { Avatar, Badge, Card, PageHeader, SegmentedControl } from '@/components/ui';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user, org, teams } = useSession();
  const { preference, setTheme } = useTheme();
  return (
    <>
      <PageHeader title="Settings" />
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
                    user.role === 'admin' ? 'info' : user.role === 'guest' ? 'warning' : 'neutral'
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
            Profile details come from {org.name}’s directory. Ask a workspace admin to change them.
          </p>
        </Card>
        <Card title="Appearance">
          <div className={styles.row}>
            <div>
              <p className={styles.label}>Theme</p>
              <p className={styles.note}>“System” follows your device’s light or dark setting.</p>
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
        <Card title="Workspace">
          <dl className={styles.details}>
            <dt>Company</dt>
            <dd>{org.name}</dd>
            <dt>Domain</dt>
            <dd>{org.domain}</dd>
            <dt>Plan</dt>
            <dd>Birdy {org.plan}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
