// Quick-add syntax: "Draft hero copy tomorrow !high @maya"
//   !urgent !high !medium !low   priority
//   @name                        assignee (first name or full name, accents ignored)
//   today, tomorrow, mon…sun,    due date (weekday = the next one)
//   next week
import { addDays, format, nextMonday } from 'date-fns';
import type { TaskPriority, User } from '@/domain/types';

export interface QuickAddResult {
  title: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function parseQuickAdd(input: string, users: User[], today = new Date()): QuickAddResult {
  const result: QuickAddResult = { title: '' };
  let text = ` ${input} `;

  text = text.replace(/\s!(urgent|high|medium|med|low)\b/i, (_m, p: string) => {
    const key = p.toLowerCase() === 'med' ? 'medium' : (p.toLowerCase() as TaskPriority);
    if (PRIORITIES.includes(key)) result.priority = key;
    return ' ';
  });

  text = text.replace(/\s@([\p{L}.'-]+)/u, (m, name: string) => {
    const n = fold(name);
    const user =
      users.find((u) => fold(u.name.split(' ')[0]) === n) ??
      users.find((u) => fold(u.name).replace(/\s+/g, '') === n.replace(/\./g, ''));
    if (!user) return m;
    result.assigneeId = user.id;
    return ' ';
  });

  const weekday = '(sun|mon|tue|wed|thu|fri|sat)(?:day|sday|s|nesday|r|rs|rsday|urday)?';
  const dateWord = new RegExp(`\\s(today|tomorrow|next week|(?:on )?${weekday})(?=\\s)`, 'i');
  text = text.replace(dateWord, (m, word: string, day?: string) => {
    const w = word.toLowerCase();
    if (w === 'today') result.dueDate = format(today, 'yyyy-MM-dd');
    else if (w === 'tomorrow') result.dueDate = format(addDays(today, 1), 'yyyy-MM-dd');
    else if (w === 'next week') result.dueDate = format(nextMonday(today), 'yyyy-MM-dd');
    else if (day) {
      const target = WEEKDAYS.indexOf(day.toLowerCase());
      const delta = (target - today.getDay() + 7) % 7 || 7;
      result.dueDate = format(addDays(today, delta), 'yyyy-MM-dd');
    } else return m;
    return ' ';
  });

  result.title = text.replace(/\s+/g, ' ').trim();
  return result;
}
