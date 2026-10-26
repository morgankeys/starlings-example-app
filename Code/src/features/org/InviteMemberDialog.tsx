import { useState, type FormEvent } from 'react';
import { Button, Dialog, Field, Input, Select, useToast } from '@/components/ui';
import type { NewMember, OrgRole } from '@/domain/types';
import { useInviteMember } from './api';
import styles from './InviteMemberDialog.module.css';

type FieldName = keyof NewMember | 'form';

/** The API returns one message; route it to the field it is about. */
function fieldForError(message: string): FieldName {
  if (/company/i.test(message)) return 'company';
  if (/email/i.test(message)) return 'email';
  if (/title/i.test(message)) return 'title';
  if (/role/i.test(message)) return 'role';
  if (/name/i.test(message)) return 'name';
  return 'form';
}

const EMPTY: NewMember = { name: '', email: '', title: '', role: 'member', company: '' };

export function InviteMemberDialog({
  open,
  onClose,
  domain,
}: {
  open: boolean;
  onClose: () => void;
  domain: string;
}) {
  const invite = useInviteMember();
  const toast = useToast();
  const [form, setForm] = useState<NewMember>(EMPTY);
  const [error, setError] = useState<{ field: FieldName; message: string }>();
  const set = <K extends keyof NewMember>(key: K, value: NewMember[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(undefined);
  };
  const close = () => {
    setForm(EMPTY);
    setError(undefined);
    invite.reset();
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate(form, {
      onSuccess: (person) => {
        toast({
          title: `Invited ${person.name}`,
          description: `${person.email} can now sign in to Birdy.`,
          tone: 'success',
        });
        close();
      },
      onError: (err) => setError({ field: fieldForError(err.message), message: err.message }),
    });
  };
  const errorFor = (field: FieldName) => (error?.field === field ? error.message : undefined);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Invite member"
      description="They can sign in right away. Signing in makes them active."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="invite-member-form"
            loading={invite.isPending}
          >
            Send invite
          </Button>
        </>
      }
    >
      <form id="invite-member-form" className={styles.form} onSubmit={submit} noValidate>
        <Field label="Name" error={errorFor('name')}>
          {(p) => (
            <Input
              {...p}
              autoFocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Jordan Lee"
            />
          )}
        </Field>
        <Field
          label="Email"
          error={errorFor('email')}
          hint={
            form.role === 'guest'
              ? 'Guests can use any email domain.'
              : `Members use a ${domain} address.`
          }
        >
          {(p) => (
            <Input
              {...p}
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder={`jordan@${domain}`}
            />
          )}
        </Field>
        <Field label="Title" error={errorFor('title')}>
          {(p) => (
            <Input
              {...p}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Product Manager"
            />
          )}
        </Field>
        <Field label="Role" error={errorFor('role')}>
          {(p) => (
            <Select
              {...p}
              value={form.role}
              onChange={(e) => set('role', e.target.value as OrgRole)}
            >
              <option value="member">Member</option>
              <option value="admin">Workspace admin</option>
              <option value="guest">Guest</option>
            </Select>
          )}
        </Field>
        {form.role === 'guest' && (
          <Field label="Company" error={errorFor('company')}>
            {(p) => (
              <Input
                {...p}
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="e.g. Northlight Studio"
              />
            )}
          </Field>
        )}
        {errorFor('form') && (
          <p role="alert" className={styles.formError}>
            {errorFor('form')}
          </p>
        )}
      </form>
    </Dialog>
  );
}
