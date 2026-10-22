import { useEffect, useRef, type ChangeEvent } from 'react';
import styles from './SelectBox.module.css';

/** A selection checkbox for task rows and group headers. Reports whether Shift was held. */
export function SelectBox({
  label,
  checked,
  indeterminate = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean, shift: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.box}
      data-component="SelectBox"
      aria-label={label}
      checked={checked}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        // React derives `change` from the click, which carries the modifier keys.
        onChange(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey === true)
      }
    />
  );
}
