import type { ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Show only the icon; `label` becomes the accessible name. */
  iconOnly?: boolean;
}

/** A small set of mutually exclusive options (view modes, filters). */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Segment<T>[];
}) {
  return (
    <div
      data-component="SegmentedControl"
      role="radiogroup"
      aria-label={label}
      className={styles.group}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.iconOnly ? o.label : undefined}
          title={o.iconOnly ? o.label : undefined}
          className={styles.segment}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {!o.iconOnly && o.label}
        </button>
      ))}
    </div>
  );
}
