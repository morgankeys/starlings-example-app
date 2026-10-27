// @mentions in comments: "@Leo can you check this?". A mention names someone by first
// name, ignoring case and accents. The mock backend (to notify) and the task panel (to
// highlight) both read mentions with these helpers so they always agree.
import type { User } from '@/domain/types';
import { fold } from './quickAdd';

// An @ that does not follow a letter or digit (so emails are skipped), then a first name
// that may contain an inner hyphen or apostrophe. A trailing "." or "," is not part of it.
const MENTION = /(?<![\p{L}\p{N}])@(\p{L}+(?:['’-]\p{L}+)*)/gu;

const firstName = (u: Pick<User, 'name'>) => fold(u.name.split(' ')[0] ?? '');

/** People whose first name matches a mention in `text`, without repeats. */
export function mentionedUsers<U extends Pick<User, 'id' | 'name'>>(text: string, users: U[]): U[] {
  const found = new Map<string, U>();
  for (const match of text.matchAll(MENTION)) {
    const name = fold(match[1] ?? '');
    for (const u of users) if (firstName(u) === name) found.set(u.id, u);
  }
  return [...found.values()];
}

export type MentionPart = { text: string; user?: undefined } | { text: string; user: User };

/** Split text into plain runs and `@Name` mentions that resolve to a user. */
export function splitMentions(text: string, users: User[]): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const user = users.find((u) => firstName(u) === fold(match[1] ?? ''));
    if (!user) continue;
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ text: match[0], user });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
