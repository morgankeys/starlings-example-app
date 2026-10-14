import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown as a tooltip. */
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md';
  /** Hide the tooltip (e.g. when a visible label sits next to it). */
  noTooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', noTooltip, className, type = 'button', ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      data-component="IconButton"
      data-variant={variant}
      data-size={size}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
  return noTooltip ? button : <Tooltip content={label}>{button}</Tooltip>;
});
