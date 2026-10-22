// Notifications from the seed story: who commented, assigned, mentioned or shared with
// whom. Maya gets six (three unread); a few other personas get some so switching people
// in the Demo panel shows a bell worth opening. Times come from the comments and events
// they refer to, so the story stays consistent.
import type { ActivityEvent, Comment, NotificationKind, NotificationRecord } from '@/domain/types';
import type { SeedClock } from './dates';

const EXCERPT_LENGTH = 140;
const excerpt = (text: string) =>
  text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : text;

export function buildNotifications(
  c: SeedClock,
  comments: Comment[],
  activity: ActivityEvent[],
): NotificationRecord[] {
  const list: NotificationRecord[] = [];
  let n = 0;
  const add = (
    userId: string,
    kind: NotificationKind,
    actorId: string,
    fields: Partial<NotificationRecord>,
    createdAt: string,
    unread: boolean,
  ) => {
    n += 1;
    list.push({
      id: `nt_${n}`,
      userId,
      kind,
      actorId,
      ...fields,
      createdAt,
      readAt: unread ? null : createdAt,
    });
  };

  /** A comment by `authorId` on `taskId` (from the seed), as a notification for `userId`. */
  const onComment = (
    userId: string,
    kind: 'commented' | 'mentioned',
    taskId: string,
    authorId: string,
    unread: boolean,
  ) => {
    const comment = comments.find((cm) => cm.taskId === taskId && cm.authorId === authorId);
    if (!comment) throw new Error(`Seed: no comment by ${authorId} on ${taskId}`);
    add(
      userId,
      kind,
      authorId,
      { taskId, commentId: comment.id, excerpt: excerpt(comment.body) },
      comment.createdAt,
      unread,
    );
  };

  /** A status event on a task (from the seed), as a notification for the task's creator. */
  const onStatus = (userId: string, taskId: string, unread: boolean) => {
    const event = activity.find((e) => e.id === `ev_${taskId}_status`);
    if (!event) throw new Error(`Seed: no status event for ${taskId}`);
    add(
      userId,
      'status_changed',
      event.actorId,
      { taskId, excerpt: event.to ?? undefined },
      event.createdAt,
      unread,
    );
  };

  // ---- Maya: six, three unread ----------------------------------------------------------
  onComment('u_maya', 'commented', 't_error_states', 'u_theo', true);
  onComment('u_maya', 'mentioned', 't_ridgeline_selects', 'u_elena', true);
  add('u_maya', 'assigned', 'u_ava', { taskId: 't_shot_list' }, c.at(-1, 11, 30), true);
  onComment('u_maya', 'commented', 't_error_states', 'u_chloe', false);
  onStatus('u_maya', 't_shipping_copy', false);
  add('u_maya', 'shared', 'u_priya', { folderId: 'fd_supplier' }, c.at(-4, 10, 5), false);

  // ---- A few for other personas ---------------------------------------------------------
  onComment('u_ben', 'mentioned', 't_safari_autocomplete', 'u_chloe', true);
  add('u_ben', 'assigned', 'u_raj', { taskId: 't_api_key' }, c.at(-3, 9, 40), false);
  onComment('u_chloe', 'commented', 't_safari_autocomplete', 'u_raj', true);
  onComment('u_julia', 'commented', 't_tent_copy', 'u_noah', true);
  onComment('u_noah', 'commented', 't_tent_copy', 'u_julia', false);
  onComment('u_ava', 'commented', 't_ridgeline_selects', 'u_elena', true);
  add('u_leo', 'assigned', 'u_maya', { taskId: 't_apple_pay' }, c.at(-2, 15, 20), false);
  add('u_elena', 'assigned', 'u_ava', { taskId: 't_ridgeline_selects' }, c.at(-3, 10, 15), true);
  add('u_elena', 'shared', 'u_ava', { folderId: 'fd_cat_photo' }, c.at(-4, 9, 30), false);

  return list;
}
