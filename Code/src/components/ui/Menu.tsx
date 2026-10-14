import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Menu.module.css';

/** Dropdown menu built on Radix. Compose: <Menu trigger={…}><MenuItem …/></Menu>. */
export function Menu({
  trigger,
  children,
  align = 'start',
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  /** Optional heading inside the menu. */
  label?: string;
}) {
  return (
    // Non-modal, so a dialog opened from an item owns focus and pointer events alone.
    <RadixMenu.Root modal={false}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          data-component="Menu"
          className={styles.content}
          align={align}
          sideOffset={6}
          collisionPadding={12}
        >
          {label && <RadixMenu.Label className={styles.label}>{label}</RadixMenu.Label>}
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export function MenuItem({
  icon,
  children,
  onSelect,
  disabled,
  danger,
  shortcut,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
}) {
  return (
    <RadixMenu.Item
      className={styles.item}
      data-variant={danger ? 'danger' : 'default'}
      disabled={disabled}
      // Let the menu finish closing before the action runs: actions often open a dialog,
      // and opening it mid-close leaves the menu mounted underneath.
      onSelect={() => onSelect && window.setTimeout(onSelect, 0)}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>{children}</span>
      {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
    </RadixMenu.Item>
  );
}

/** A choosable option; shows a check when `checked`. */
export function MenuOption({
  icon,
  children,
  checked,
  onSelect,
}: {
  icon?: ReactNode;
  children: ReactNode;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <RadixMenu.CheckboxItem className={styles.item} checked={checked} onSelect={onSelect}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>{children}</span>
      <RadixMenu.ItemIndicator className={styles.check}>
        <Check aria-hidden />
      </RadixMenu.ItemIndicator>
    </RadixMenu.CheckboxItem>
  );
}

export const MenuSeparator = () => <RadixMenu.Separator className={styles.separator} />;
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <RadixMenu.Label className={styles.label}>{children}</RadixMenu.Label>
);
