// Dev-only pages. Loaded by app/router.tsx behind import.meta.env.DEV, so they never reach
// a production build. scripts/check-dev-pages.mjs fails `build` if this marker shows up in
// dist/. See Agents/context/dev-only-pages.md.
import { Link, Route, Routes } from 'react-router-dom';
import { PageHeader } from '@/components/ui';
import { ComponentSpecimens } from './ComponentSpecimens';

export const BIRDY_DEV_ONLY_PAGE = 'BIRDY_DEV_ONLY_PAGE';

function DevIndex() {
  return (
    <>
      <PageHeader
        eyebrow={`Dev only · ${BIRDY_DEV_ONLY_PAGE}`}
        title="Sandbox"
        description="Pages for building Birdy. They render on the dev server only."
      />
      <ul>
        <li>
          <Link to="components">Component specimens</Link>
        </li>
      </ul>
    </>
  );
}

/** Lazy route module for /dev/*. */
export function Component() {
  return (
    <Routes>
      <Route index element={<DevIndex />} />
      <Route path="components" element={<ComponentSpecimens />} />
    </Routes>
  );
}
