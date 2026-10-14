// `validate`: design-system validation. Implements the validator contract in
// Docs/Design system/design-in-code architecture.md and rewrites
// Docs/Design system/deviations-backlog.md.
//
//   node scripts/ds-validate.mjs           exits 0, deviations are warnings
//   node scripts/ds-validate.mjs --strict  exits 1 when any deviation exists (local only)
//
// Scope: every .css file under src/ plus inline `style={{…}}` props in .tsx files.
//   - src/styles/tokens.generated.css  exempt (generated)
//   - src/styles/global.css            the one global stylesheet
//   - **/*.module.css                   scoped component styles
//   - any other .css                    flagged as unscoped-style
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { CODE_DIR, PREFIX } from './lib/tokens-source.mjs';

const SRC = path.join(CODE_DIR, 'src');
const BACKLOG = path.resolve(CODE_DIR, '../Docs/Design system/deviations-backlog.md');
const GENERATED = 'src/styles/tokens.generated.css';
const GLOBAL = 'src/styles/global.css';
const SENTINEL = 'Unknown — needs review';
const strict = process.argv.includes('--strict');

const NAMED_COLORS =
  'white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|maroon|navy|teal|olive|lime|aqua|fuchsia|brown|gold|beige|ivory|coral|salmon|tomato|crimson|indigo|violet|plum|tan|khaki';
const COLOR_LITERAL = new RegExp(
  `#[0-9a-f]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(|\\b(?:${NAMED_COLORS})\\b`,
  'i',
);
const LENGTH = /(?<![\w-])-?(?:\d*\.)?\d+(?:px|rem|em|vh|vw|ch|pt)\b/i;
const COLOR_PROPS =
  /^(color|background(-color|-image)?|background|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|text-decoration(-color)?|column-rule(-color)?)$/;
const SPACING_PROPS = /^(margin|padding)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/;
const RADIUS_PROPS = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;
const KEYWORDS = /^(inherit|initial|unset|revert|normal|none|auto|0)$/i;

/** Remove namespace token names so their digits are not read as lengths or colors. */
const stripTokens = (v) => v.replace(new RegExp(`--${PREFIX}-[\\w-]+`, 'g'), '--token');
const findings = [];
const add = (file, line, rule, detail) => findings.push({ file, line, rule, detail });

function checkDecl(file, decl, { component }) {
  const { prop, value } = decl;
  const line = decl.source?.start?.line ?? 0;
  const v = stripTokens(value);

  if (prop.startsWith('--')) {
    if (!prop.startsWith(`--${PREFIX}-`)) {
      add(file, line, 'non-token-variable', `\`${prop}\` is outside the \`--${PREFIX}-*\` namespace.`);
    } else if (component && !/var\(/.test(value)) {
      add(file, line, 'local-token-override', `\`${prop}\` redefines a namespace token with a literal value: \`${value}\`.`);
    }
    return;
  }
  for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!m[1].startsWith(`--${PREFIX}-`)) {
      add(file, line, 'non-token-variable', `\`${m[1]}\` is outside the \`--${PREFIX}-*\` namespace.`);
    }
  }
  if (COLOR_PROPS.test(prop) && COLOR_LITERAL.test(v)) {
    add(file, line, 'hardcoded-color', `\`${prop}: ${value}\` uses a literal color.`);
  }
  if (SPACING_PROPS.test(prop) && LENGTH.test(v)) {
    add(file, line, 'raw-spacing', `\`${prop}: ${value}\` uses a raw length.`);
  }
  if (RADIUS_PROPS.test(prop) && LENGTH.test(v)) {
    add(file, line, 'raw-border-radius', `\`${prop}: ${value}\` uses a raw length.`);
  }
  if (prop === 'font-family' && !KEYWORDS.test(value) && !new RegExp(`^var\\(--${PREFIX}-font-family-`).test(value)) {
    add(file, line, 'non-token-font-family', `\`font-family: ${value}\` does not resolve through a token.`);
  }
  if (prop === 'font-size' && LENGTH.test(v)) {
    add(file, line, 'raw-font-size', `\`font-size: ${value}\` uses a raw length.`);
  }
  if (/^(font-weight|line-height|letter-spacing)$/.test(prop) && !KEYWORDS.test(value) && !/^var\(/.test(value)) {
    add(file, line, 'raw-typography', `\`${prop}: ${value}\` is a literal value.`);
  }
  if (prop === 'font' && !KEYWORDS.test(value)) {
    add(file, line, 'raw-typography', `\`font\` shorthand: \`${value}\`.`);
  }
}

function checkCss(file) {
  const rel = path.relative(CODE_DIR, file).split(path.sep).join('/');
  if (rel === GENERATED) return;
  const isModule = rel.endsWith('.module.css');
  const isGlobal = rel === GLOBAL;
  if (!isModule && !isGlobal) {
    add(rel, 1, 'unscoped-style', 'Stylesheet is neither a CSS Module nor the global stylesheet.');
  }
  const root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  if (isGlobal) {
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
      if (/\.[a-z_-]/i.test(rule.selector)) {
        add(rel, rule.source?.start?.line ?? 0, 'global-component-leak', `Class selector \`${rule.selector}\` in the global stylesheet.`);
      }
    });
  }
  root.walkDecls((decl) => checkDecl(rel, decl, { component: !isGlobal }));
}

function checkTsx(file) {
  const rel = path.relative(CODE_DIR, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((text, i) => {
    if (/\bstyle=\{\{/.test(text)) add(rel, i + 1, 'inline-style', 'Inline `style` prop; use a scoped class or a data attribute.');
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.css')) checkCss(full);
    else if (entry.name.endsWith('.tsx')) checkTsx(full);
  }
}

// ---- backlog -------------------------------------------------------------------------

const key = (f) => `${f.file}\u0000${f.rule}\u0000${f.detail}`;

function readRationale() {
  const carried = new Map();
  if (!fs.existsSync(BACKLOG)) return carried;
  let file = null;
  let last = null;
  for (const line of fs.readFileSync(BACKLOG, 'utf8').split('\n')) {
    const h = line.match(/^### `(.+)`$/);
    if (h) {
      file = h[1];
      continue;
    }
    const e = line.match(/^- \*\*L\d+ · ([\w-]+)\*\* — (.*)$/);
    if (e && file) {
      last = `${file}\u0000${e[1]}\u0000${e[2]}`;
      continue;
    }
    const r = line.match(/^ {2}- Rationale: (.*)$/);
    if (r && last) {
      if (r[1].trim() !== SENTINEL) carried.set(last, r[1].trim());
      last = null;
    }
  }
  return carried;
}

function render(carried) {
  const counts = {};
  for (const f of findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
  const out = [
    '# Design-system deviations backlog',
    '',
    '<!-- GENERATED by `npm run validate` (Code/scripts/ds-validate.mjs). Only the',
    '     `Rationale:` lines are editable; they are carried forward by file + rule + detail. -->',
    '',
    `**${findings.length}** deviation${findings.length === 1 ? '' : 's'}.`,
    '',
  ];
  if (findings.length) {
    out.push('| Rule | Count |', '| --- | --- |');
    for (const rule of Object.keys(counts).sort()) out.push(`| \`${rule}\` | ${counts[rule]} |`);
    out.push('');
  } else {
    out.push('Nothing to fix. Every style resolves through a token.', '');
  }
  const byFile = new Map();
  for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  for (const file of [...byFile.keys()].sort()) {
    out.push(`### \`${file}\``, '');
    for (const f of byFile.get(file).sort((a, b) => a.line - b.line)) {
      out.push(`- **L${f.line} · ${f.rule}** — ${f.detail}`);
      out.push(`  - Rationale: ${carried.get(key(f)) ?? SENTINEL}`);
    }
    out.push('');
  }
  return out.join('\n');
}

walk(SRC);
const content = render(readRationale());
const previous = fs.existsSync(BACKLOG) ? fs.readFileSync(BACKLOG, 'utf8') : '';
if (content !== previous) fs.writeFileSync(BACKLOG, content);

const summary = {};
for (const f of findings) summary[f.rule] = (summary[f.rule] ?? 0) + 1;
console.log(`validate: ${findings.length} deviation(s)${content !== previous ? ' (backlog updated)' : ''}`);
for (const [rule, n] of Object.entries(summary)) console.log(`  ${rule}: ${n}`);
process.exit(strict && findings.length ? 1 : 0);
