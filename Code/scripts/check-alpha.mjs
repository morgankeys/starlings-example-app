// Alpha regression guard (runs in `build`). Never simplify, remove, or bypass it.
//
// For every source color token with alpha < 1, the generated CSS must carry an alpha
// channel: rgb(… / a) or an 8-digit hex. Fails the build and lists offenders otherwise.
import fs from 'node:fs';
import postcss from 'postcss';
import { GENERATED_CSS, isDarkMode, readSources, varName } from './lib/tokens-source.mjs';

const root = postcss.parse(fs.readFileSync(GENERATED_CSS, 'utf8'));
const emitted = { base: new Map(), dark: new Map() };
root.walkRules((rule) => {
  const scope =
    rule.selector.includes('dark') || rule.selector.includes(":not([data-theme='light'])")
      ? 'dark'
      : 'base';
  rule.walkDecls((decl) => emitted[scope].set(decl.prop, decl.value));
});

const hasAlpha = (v) => /\/\s*[\d.]+\s*\)$/.test(v) || /^#[0-9a-f]{8}$/i.test(v);
const failures = [];
let checked = 0;
for (const source of readSources()) {
  const scope = isDarkMode(source.mode) ? 'dark' : 'base';
  for (const token of source.tokens) {
    if (token.type !== 'color' || (token.value.alpha ?? 1) >= 1) continue;
    checked += 1;
    const name = varName(token);
    const value = emitted[scope].get(name);
    if (!value || !hasAlpha(value)) {
      failures.push(
        `${source.file} ${name}: alpha ${token.value.alpha}, emitted ${value ?? '(missing)'}`,
      );
    }
  }
}

if (failures.length) {
  console.error(`check-alpha: ${failures.length} translucent token(s) lost their alpha:`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('Fix the color transform in scripts/tokens.mjs. Do not weaken this check.');
  process.exit(1);
}
console.log(`check-alpha: ${checked} translucent tokens keep their alpha`);
