import { CheckSquare, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Avatar,
  AvatarStack,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuItem,
  Notice,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';
import { TASK_PRIORITIES, TASK_STATUSES, type User } from '@/domain/types';
import { FileIcon } from '@/features/files/FileIcon';
import { PriorityIcon, StatusIcon } from '@/features/tasks/TaskIcons';
import styles from './ComponentSpecimens.module.css';

const SAMPLE_PEOPLE: User[] = (['teal', 'violet', 'amber', 'sky', 'rust'] as const).map(
  (color, i) => ({
    id: `s${i}`,
    name: ['Ada Byron', 'Grace Hopper', 'Alan Kay', 'Joan Clarke', 'Ken Thompson'][i],
    email: '',
    title: '',
    role: 'member',
    color,
    location: '',
  }),
);

function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className={styles.specimen}>
      <h2 className={styles.name}>{name}</h2>
      <div className={styles.row}>{children}</div>
    </section>
  );
}

/** Every primitive in components/ui, in its variants and states. */
export function ComponentSpecimens() {
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [date, setDate] = useState<string | null>(null);
  const [checked, setChecked] = useState(true);

  return (
    <div className={styles.page}>
      <h1>Component specimens</h1>
      <Specimen name="Button">
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" icon={<Trash2 />}>
          Danger
        </Button>
        <Button variant="ai" icon={<Sparkles />}>
          Ask Birdy
        </Button>
        <Button size="sm" icon={<Plus />}>
          Small
        </Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
      </Specimen>
      <Specimen name="IconButton">
        <IconButton label="Add" icon={<Plus />} />
        <IconButton label="Add" icon={<Plus />} variant="secondary" />
        <IconButton label="Add" icon={<Plus />} size="sm" />
      </Specimen>
      <Specimen name="Badge">
        {(['neutral', 'success', 'info', 'warning', 'danger', 'ai'] as const).map((t) => (
          <Badge key={t} tone={t}>
            {t}
          </Badge>
        ))}
      </Specimen>
      <Specimen name="Avatar">
        {(['xs', 'sm', 'md', 'lg'] as const).map((s) => (
          <Avatar key={s} user={SAMPLE_PEOPLE[1]} size={s} />
        ))}
        <AvatarStack users={SAMPLE_PEOPLE} max={4} />
      </Specimen>
      <Specimen name="Task icons">
        {TASK_STATUSES.map((s) => (
          <StatusIcon key={s} status={s} />
        ))}
        {TASK_PRIORITIES.map((p) => (
          <PriorityIcon key={p} priority={p} />
        ))}
      </Specimen>
      <Specimen name="File icons">
        {(['doc', 'sheet', 'slides', 'pdf', 'image', 'folder'] as const).map((k) => (
          <FileIcon key={k} kind={k} />
        ))}
      </Specimen>
      <Specimen name="Form controls">
        <div className={styles.form}>
          <Field label="Label" hint="Helper text">
            {(p) => <Input {...p} placeholder="Placeholder" />}
          </Field>
          <Field label="With error" error="Something is wrong">
            {(p) => <Input {...p} defaultValue="Bad value" />}
          </Field>
          <Field label="Select">
            {(p) => (
              <Select {...p}>
                <option>One</option>
                <option>Two</option>
              </Select>
            )}
          </Field>
          <Field label="Textarea" optional>
            {(p) => <Textarea {...p} rows={2} />}
          </Field>
          <Checkbox label="Checkbox" checked={checked} onChange={setChecked} />
        </div>
      </Specimen>
      <Specimen name="SegmentedControl, Tabs, DatePicker, Kbd">
        <SegmentedControl
          label="Demo"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
            { value: 'c', label: 'Gamma' },
          ]}
        />
        <DatePicker value={date} onChange={setDate} />
        <Kbd>⌘K</Kbd>
        <div className={styles.wide}>
          <Tabs
            label="Demo tabs"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'one', label: 'One', count: 3 },
              { value: 'two', label: 'Two' },
            ]}
          >
            <p>Panel {tab}</p>
          </Tabs>
        </div>
      </Specimen>
      <Specimen name="Menu, Dialog, Toast">
        <Menu trigger={<Button>Open menu</Button>}>
          <MenuItem icon={<CheckSquare />}>An item</MenuItem>
          <MenuItem icon={<Trash2 />} danger>
            Danger item
          </MenuItem>
        </Menu>
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Button
          onClick={() =>
            toast({
              title: 'Saved',
              tone: 'success',
              action: { label: 'Undo', onClick: () => undefined },
            })
          }
        >
          Show toast
        </Button>
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Dialog title"
          description="Supporting text."
          footer={
            <Button variant="primary" onClick={() => setDialog(false)}>
              Done
            </Button>
          }
        >
          <p>Dialog body.</p>
        </Dialog>
      </Specimen>
      <Specimen name="Breadcrumbs, Notice">
        <Breadcrumbs
          items={[
            { label: 'All files', to: '#' },
            { label: 'Projects', to: '#' },
            { label: 'Current' },
          ]}
        />
        <Notice>Neutral notice</Notice>
        <Notice tone="warning">Warning notice</Notice>
        <Notice tone="ai" icon={<Sparkles />}>
          AI notice
        </Notice>
      </Specimen>
      <Specimen name="Card and states">
        <div className={styles.wide}>
          <Card
            title="Card title"
            icon={<CheckSquare />}
            actions={
              <Button size="sm" variant="ghost">
                Action
              </Button>
            }
          >
            <Skeleton lines={3} />
          </Card>
        </div>
        <div className={styles.wide}>
          <EmptyState
            icon={<CheckSquare />}
            title="Empty state"
            description="Says what to do next."
            action={<Button variant="primary">Do it</Button>}
          />
        </div>
        <div className={styles.wide}>
          <ErrorState error={new Error('The server had a problem.')} onRetry={() => undefined} />
        </div>
        <Spinner />
      </Specimen>
    </div>
  );
}
