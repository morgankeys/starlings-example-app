import * as RadixPopover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import styles from './Popover.module.css';

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  label,
  padding = 'md',
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'end' | 'center';
  /** Accessible name for the popover content. */
  label: string;
  /** `none` lets the content run edge to edge (lists with their own rows and dividers). */
  padding?: 'none' | 'md';
}) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          data-component="Popover"
          data-padding={padding}
          aria-label={label}
          className={styles.content}
          align={align}
          sideOffset={6}
          collisionPadding={12}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export const PopoverClose = RadixPopover.Close;
