import { describe, expect, it } from 'vitest';
import type { User } from '@/domain/types';
import { mentionedUsers, splitMentions } from './mentions';

const user = (id: string, name: string) => ({ id, name }) as User;
const users = [
  user('u_leo', 'Leo Brandt'),
  user('u_ines', 'Inés Carvalho'),
  user('u_chloe', 'Chloé Martin'),
];

describe('mentions', () => {
  it('matches first names ignoring case and accents', () => {
    expect(mentionedUsers('@LEO, @ines and @Chloe?', users).map((u) => u.id)).toEqual([
      'u_leo',
      'u_ines',
      'u_chloe',
    ]);
  });

  it('ignores unknown names, full names after the first, and emails', () => {
    expect(mentionedUsers('@nobody leo@meridianoutdoor.com', users)).toEqual([]);
    expect(mentionedUsers('@Leo Brandt', users).map((u) => u.id)).toEqual(['u_leo']);
  });

  it('lists each person once', () => {
    expect(mentionedUsers('@Leo @leo @LEO', users)).toHaveLength(1);
  });

  it('splits text around resolved mentions and leaves unresolved ones as plain text', () => {
    const parts = splitMentions('Hi @Leo, ask @Zed. Thanks!', users);
    expect(parts.map((p) => p.text)).toEqual(['Hi ', '@Leo', ', ask @Zed. Thanks!']);
    expect(parts.map((p) => p.user?.id)).toEqual([undefined, 'u_leo', undefined]);
    expect(splitMentions('no mentions', users)).toEqual([{ text: 'no mentions' }]);
  });
});
