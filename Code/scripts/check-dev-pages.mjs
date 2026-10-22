// Dev-only pages guard (runs at the end of `build`). Never remove or weaken it.
//
// Pages under src/routes/dev/ render on the dev server only. They are loaded behind
// `import.meta.env.DEV`, so Vite drops them from production builds. This check fails the
// build if anything from them reaches dist/: a dev/ folder, or the marker string every
// dev page module exports.
import fs from 'node:fs';
import path from 'node:path';
import { CODE_DIR } from './lib/tokens-source.mjs';

const DIST = path.join(CODE_DIR, 'dist');
const MARKER = 'BIRDY_DEV_ONLY_PAGE';
const leaks = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'dev') leaks.push(`${path.relative(CODE_DIR, full)}/ (dev folder)`);
      walk(full);
    } else if (/\.(js|html|css|map)$/.test(entry.name)) {
      if (fs.readFileSync(full, 'utf8').includes(MARKER)) {
        leaks.push(`${path.relative(CODE_DIR, full)} (contains ${MARKER})`);
      }
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error('check-dev-pages: dist/ not found; run the build first');
  process.exit(1);
}
walk(DIST);
if (leaks.length) {
  console.error('check-dev-pages: dev-only pages leaked into the build:');
  for (const l of leaks) console.error(`  - ${l}`);
  process.exit(1);
}
console.log('check-dev-pages: no dev-only pages in dist/');
