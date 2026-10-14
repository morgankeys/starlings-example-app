import type { User } from '@/domain/types';
import { Tooltip } from './Tooltip';
import styles from './Avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export function Avatar({
  user,
  size = 'sm',
  tooltip = false,
}: {
  user: Pick<User, 'name' | 'color'>;
  size?: AvatarSize;
  tooltip?: boolean;
}) {
  const el = (
    <span
      data-component="Avatar"
      data-size={size}
      data-color={user.color}
      className={styles.avatar}
      role="img"
      aria-label={user.name}
    >
      {initials(user.name)}
    </span>
  );
  return tooltip ? <Tooltip content={user.name}>{el}</Tooltip> : el;
}

export function AvatarStack({
  users,
  max = 4,
  size = 'sm',
}: {
  users: Pick<User, 'id' | 'name' | 'color'>[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span data-component="AvatarStack" className={styles.stack}>
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size={size} tooltip />
      ))}
      {rest > 0 && (
        <span
          className={styles.avatar}
          data-size={size}
          data-color="neutral"
          aria-label={`${rest} more`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
