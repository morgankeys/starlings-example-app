import { CalendarDays } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { dayFromToday, formatDue, nextWeekISO, todayISO } from '@/lib/dates';
import { Popover } from './Popover';
import styles from './DatePicker.module.css';

/** Pick a due date: quick options plus a native date input. */
export function DatePicker({
  value,
  onChange,
  trigger,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  /** Custom trigger; defaults to a button showing the date. */
  trigger?: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const choose = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };
  const quick: Array<[string, string | null]> = [
    ['Today', todayISO()],
    ['Tomorrow', dayFromToday(1)],
    ['Next week', nextWeekISO()],
    ['No date', null],
  ];
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Choose a due date"
      trigger={
        trigger ?? (
          <button
            type="button"
            className={styles.trigger}
            disabled={disabled}
            data-component="DatePicker"
          >
            <CalendarDays aria-hidden />
            {formatDue(value)}
          </button>
        )
      }
    >
      <div className={styles.quick}>
        {quick.map(([label, v]) => (
          <button
            key={label}
            type="button"
            className={styles.option}
            data-selected={v === value}
            onClick={() => choose(v)}
          >
            {label}
            {v && <span className={styles.hint}>{formatDue(v)}</span>}
          </button>
        ))}
      </div>
      <label className={styles.custom}>
        <span>Pick a date</span>
        <input
          type="date"
          className={styles.input}
          value={value ?? ''}
          onChange={(e) => e.target.value && choose(e.target.value)}
        />
      </label>
    </Popover>
  );
}
