import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RouteError } from './RouteError';
import { RequireSession } from './session';
import { FilesPage } from '@/routes/files/FilesPage';
import { HomePage } from '@/routes/home/HomePage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { PeoplePage } from '@/routes/people/PeoplePage';
import { PersonPage } from '@/routes/people/PersonPage';
import { ProjectPage } from '@/routes/projects/ProjectPage';
import { ProjectsPage } from '@/routes/projects/ProjectsPage';
import { SettingsPage } from '@/routes/settings/SettingsPage';
import { SignInPage } from '@/routes/sign-in/SignInPage';
import { MyTasksPage } from '@/routes/tasks/MyTasksPage';
import { TeamPage } from '@/routes/teams/TeamPage';
import { TeamsPage } from '@/routes/teams/TeamsPage';

const appRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'tasks', element: <MyTasksPage /> },
  { path: 'files', element: <FilesPage view="folder" /> },
  { path: 'files/folders/:folderId', element: <FilesPage view="folder" /> },
  { path: 'files/recent', element: <FilesPage view="recent" /> },
  { path: 'files/shared', element: <FilesPage view="shared" /> },
  { path: 'files/starred', element: <FilesPage view="starred" /> },
  { path: 'people', element: <PeoplePage /> },
  { path: 'people/:userId', element: <PersonPage /> },
  { path: 'teams', element: <TeamsPage /> },
  { path: 'teams/:teamId', element: <TeamPage /> },
  { path: 'projects', element: <ProjectsPage /> },
  { path: 'projects/:projectId', element: <ProjectPage /> },
  { path: 'settings', element: <SettingsPage /> },
];

// Dev-only pages (component specimens) render on the dev server only. Vite replaces
// import.meta.env.DEV with false in production builds, so this import is dropped from
// the bundle; scripts/check-dev-pages.mjs fails the build if it ever leaks.
if (import.meta.env.DEV) {
  appRoutes.push({ path: 'dev/*', lazy: () => import('@/routes/dev/DevRoutes') });
}

export const router = createBrowserRouter(
  [
    { path: '/sign-in', element: <SignInPage />, errorElement: <RouteError /> },
    {
      path: '/',
      element: (
        <RequireSession>
          <AppShell />
        </RequireSession>
      ),
      errorElement: <RouteError />,
      children: [...appRoutes, { path: '*', element: <NotFoundPage /> }],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
