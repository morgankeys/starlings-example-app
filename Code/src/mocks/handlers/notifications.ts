import { http } from 'msw';
import type { ID } from '@/domain/types';
import { buildActivityFeed } from '../activityFeed';
import { API, badRequest, body, route } from '../http';
import { listNotifications, markRead } from '../notify';

export const notificationHandlers = [
  http.get(
    `${API}/notifications`,
    route(({ db, user, url }) =>
      listNotifications(db, user, Number(url.searchParams.get('limit'))),
    ),
  ),

  http.post(
    `${API}/notifications/read`,
    route(async ({ db, user, request }) => {
      const input = await body<{ ids?: ID[]; all?: boolean }>(request);
      if (input.all === true) markRead(db, user, { all: true });
      else if (Array.isArray(input.ids)) markRead(db, user, { ids: input.ids });
      else throw badRequest('Send { ids } or { all: true }');
      return { unreadCount: listNotifications(db, user).unreadCount };
    }),
  ),

  http.get(
    `${API}/activity`,
    route(({ db, user, url }) =>
      buildActivityFeed(db, user, Number(url.searchParams.get('limit'))),
    ),
  ),
];
