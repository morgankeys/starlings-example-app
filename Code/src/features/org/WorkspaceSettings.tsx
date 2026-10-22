import { Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input, useToast } from '@/components/ui';
import type { Organization } from '@/domain/types';
import { useUpdateOrg } from './api';
import styles from './WorkspaceSettings.module.css';

/** Workspace details. Admins can rename the organization; everyone else sees it read-only. */
export function WorkspaceSettings({ org, canEdit }: { org: Organization; canEdit: boolean }) {
  const update = useUpdateOrg();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [error, setError] = useState<string>();

  const start = () => {
    setName(org.name);
    setError(undefined);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(undefined);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) return setError('Give the workspace a name');
    if (next === org.name) return cancel();
    update.mutate(
      { name: next },
      {
        onSuccess: (saved) => {
          setEditing(false);
          toast({
            title: 'Workspace renamed',
            description: `It’s now ${saved.name}.`,
            tone: 'success',
          });
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Card title="Workspace">
      <dl className={styles.details}>
        <dt>Company</dt>
        <dd>
          {editing ? (
            <form className={styles.form} onSubmit={save} noValidate>
              <Field label="Company name" error={error}>
                {(p) => (
                  <Input
                    {...p}
                    autoFocus
                    value={name}
                    onChange={(e) => (setName(e.target.value), setError(undefined))}
                  />
                )}
              </Field>
              <div className={styles.actions}>
                <Button variant="primary" size="sm" type="submit" loading={update.isPending}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <span className={styles.value}>
              {org.name}
              {canEdit && (
                <Button variant="ghost" size="sm" icon={<Pencil />} onClick={start}>
                  Rename
                </Button>
              )}
            </span>
          )}
        </dd>
        <dt>Domain</dt>
        <dd>{org.domain}</dd>
        <dt>Plan</dt>
        <dd>Birdy {org.plan}</dd>
      </dl>
      {!canEdit && <p className={styles.note}>Only workspace admins can change these details.</p>}
    </Card>
  );
}
