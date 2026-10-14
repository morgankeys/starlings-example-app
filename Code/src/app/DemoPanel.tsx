import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { demoApi, sessionApi, type DemoSettings } from '@/api/endpoints';
import { keys } from '@/api/keys';
import {
  Button,
  Checkbox,
  Field,
  Popover,
  SegmentedControl,
  Select,
  useToast,
} from '@/components/ui';
import { useSession, useSignIn } from './session';
import styles from './DemoPanel.module.css';

/**
 * The test bed's control panel: switch persona, simulate network conditions, reset data.
 * It ships with the prototype (it is how people demo it) and talks to the mock backend
 * through /api/v1/__demo endpoints, which ignore simulated latency and failures.
 */
export function DemoPanel() {
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const signIn = useSignIn();
  const { data: people } = useQuery({
    queryKey: keys.signInPeople,
    queryFn: sessionApi.people,
    staleTime: Infinity,
  });
  const { data: settings } = useQuery({ queryKey: keys.demo, queryFn: demoApi.settings });

  const update = useMutation({
    mutationFn: (patch: Partial<DemoSettings>) => demoApi.update(patch),
    onSuccess: (next) => {
      qc.setQueryData(keys.demo, next);
      qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== 'demo' && q.queryKey[0] !== 'session',
      });
    },
  });

  const reset = useMutation({
    mutationFn: (mode: 'seed' | 'empty') => demoApi.reset(mode),
    onSuccess: (_r, mode) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'demo' });
      navigate('/');
      toast({
        title: mode === 'seed' ? 'Demo data reset' : 'Switched to an empty workspace',
        tone: 'success',
      });
    },
  });

  return (
    <div className={styles.anchor}>
      <Popover
        label="Demo controls"
        align="start"
        trigger={
          <button
            type="button"
            className={styles.trigger}
            data-warning={settings?.failRequests || settings?.latency === 'slow'}
          >
            <FlaskConical aria-hidden />
            Demo
          </button>
        }
      >
        <div className={styles.panel}>
          <p className={styles.intro}>Controls for the Birdy test bed. Not part of the product.</p>

          <Field
            label="Signed in as"
            hint="Switch to see Birdy as an admin, a team lead, a member or a guest."
          >
            {(props) => (
              <Select
                {...props}
                value={user.id}
                onChange={(e) =>
                  signIn.mutate(e.target.value, {
                    onSuccess: (s) => {
                      navigate('/');
                      toast({ title: `Signed in as ${s.user.name}` });
                    },
                  })
                }
              >
                {people?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} —{' '}
                    {u.role === 'admin'
                      ? 'Admin'
                      : u.role === 'guest'
                        ? `Guest (${u.company})`
                        : u.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className={styles.section}>
            <span className={styles.label}>Network</span>
            <SegmentedControl
              label="Simulated latency"
              value={settings?.latency ?? 'realistic'}
              onChange={(latency) => update.mutate({ latency })}
              options={[
                { value: 'none', label: 'Instant' },
                { value: 'realistic', label: 'Realistic' },
                { value: 'slow', label: 'Slow' },
              ]}
            />
            <Checkbox
              label="Make every request fail"
              checked={settings?.failRequests ?? false}
              onChange={(failRequests) => update.mutate({ failRequests })}
            />
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Data</span>
            <div className={styles.row}>
              <Button
                size="sm"
                icon={<RotateCcw />}
                loading={reset.isPending && reset.variables === 'seed'}
                onClick={() => reset.mutate('seed')}
              >
                Reset demo data
              </Button>
              <Button
                size="sm"
                icon={<Trash2 />}
                loading={reset.isPending && reset.variables === 'empty'}
                onClick={() => reset.mutate('empty')}
              >
                Empty workspace
              </Button>
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
