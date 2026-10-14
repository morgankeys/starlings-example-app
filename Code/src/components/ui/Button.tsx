import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
export type ButtonSize = 'sm' | 'md';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label (a lucide icon element). */
  icon?: ReactNode;
  /** Icon after the label. */
  trailingIcon?: ReactNode;
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

/** The app's button. One `primary` per view; `ai` is for Ask Birdy entry points. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    trailingIcon,
    loading,
    children,
    className,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-component="Button"
      data-variant={variant}
      data-size={size}
      className={[styles.button, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children && <span className={styles.label}>{children}</span>}
      {trailingIcon}
    </button>
  );
});

export interface LinkButtonProps extends CommonProps, LinkProps {}

/** A link that looks like a button, for navigation. */
export function LinkButton({
  variant = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  children,
  className,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      data-component="Button"
      data-variant={variant}
      data-size={size}
      className={[styles.button, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
      {children && <span className={styles.label}>{children}</span>}
      {trailingIcon}
    </Link>
  );
}
