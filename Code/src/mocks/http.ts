// Shared plumbing for the mock API: simulated latency and failures (from the demo panel),
// the signed-in user, and consistent JSON errors.
import {
  HttpResponse,
  delay,
  type DefaultBodyType,
  type PathParams,
  type StrictRequest,
} from 'msw';
import type { User } from '@/domain/types';
import { getDb, save } from './db';
import type { Database } from './db-types';

export const API = '/api/v1';

export interface DemoSettings {
  latency: 'none' | 'realistic' | 'slow';
  failRequests: boolean;
}

const SETTINGS_KEY = 'birdy.demo';
const LATENCY_MS: Record<DemoSettings['latency'], [number, number]> = {
  none: [0, 0],
  realistic: [120, 380],
  slow: [1200, 1800],
};

export function getDemoSettings(): DemoSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { latency: 'realistic', failRequests: false, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { latency: 'realistic', failRequests: false };
}

export function setDemoSettings(next: DemoSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found`);
export const forbidden = (message = "You don't have permission to do that") =>
  new HttpError(403, 'forbidden', message);
export const badRequest = (message: string) => new HttpError(400, 'bad_request', message);

export interface RouteContext<P extends PathParams = PathParams> {
  request: StrictRequest<DefaultBodyType>;
  params: P;
  url: URL;
  db: Database;
  user: User;
}

type Result = Response | object | null | undefined;

/**
 * Wrap a handler: wait the simulated latency, fail if the demo panel says so, resolve the
 * signed-in user (401 when signed out), persist mutations, and turn thrown HttpErrors
 * into JSON error bodies.
 */
export function route<P extends PathParams = PathParams>(
  fn: (ctx: RouteContext<P>) => Result | Promise<Result>,
  opts: { auth?: boolean; demo?: boolean; failable?: boolean } = {},
) {
  const { auth = true, demo = false, failable = true } = opts;
  return async ({ request, params }: { request: StrictRequest<DefaultBodyType>; params: P }) => {
    const settings = getDemoSettings();
    if (!demo) {
      const [min, max] = LATENCY_MS[settings.latency];
      if (max) await delay(min + Math.random() * (max - min));
      if (settings.failRequests && failable) {
        return HttpResponse.json(
          { error: { code: 'server_error', message: 'The server had a problem. Try again.' } },
          { status: 500 },
        );
      }
    }
    const db = getDb();
    const user = db.users.find((u) => u.id === db.sessionUserId);
    if (auth && !user) {
      return HttpResponse.json(
        { error: { code: 'unauthenticated', message: 'Sign in to continue' } },
        { status: 401 },
      );
    }
    try {
      const result = await fn({ request, params, url: new URL(request.url), db, user: user! });
      if (request.method !== 'GET') save();
      if (result instanceof Response) return result;
      if (result === null || result === undefined) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        return HttpResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.status },
        );
      }
      console.error('[mock api]', err);
      return HttpResponse.json(
        { error: { code: 'server_error', message: 'Something went wrong' } },
        { status: 500 },
      );
    }
  };
}

export async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest('Expected a JSON body');
  }
}

export const now = () => new Date().toISOString();
