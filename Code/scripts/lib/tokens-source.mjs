// Shared helpers for reading the Figma variables export.
// Used by tokens.mjs (the converter) and check-alpha.mjs (the regression guard).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CODE_DIR = path.resolve(here, '../..');
export const TOKENS_DIR = path.resolve(CODE_DIR, '../Docs/Design system/Figma tokens');
export const UNPACKED_DIR = path.join(TOKENS_DIR, 'unpacked');
export const GENERATED_CSS = path.join(CODE_DIR, 'src/styles/tokens.generated.css');
export const PREFIX = 'bd';

/** Modes that map to the dark theme. Every other mode is the base (`:root`). */
export const DARK_MODES = new Set(['dark']);

/**
 * Read every `*.tokens.json` under unpacked/<collection>/ and flatten it.
 * Returns [{ collection, mode, file, tokens: [{ path: string[], type, value }] }].
 */
export function readSources() {
  if (!fs.existsSync(UNPACKED_DIR)) return [];
  const sources = [];
  for (const collection of fs.readdirSync(UNPACKED_DIR).sort()) {
    const dir = path.join(UNPACKED_DIR, collection);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.tokens.json')) continue;
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const mode = json.$extensions?.['com.figma.modeName'] ?? file.replace('.tokens.json', '');
      const tokens = [];
      walk(json, [], tokens);
      sources.push({ collection, mode, file: path.join(collection, file), tokens });
    }
  }
  return sources;
}

function walk(node, trail, out) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || child === null || typeof child !== 'object') continue;
    if ('$type' in child && '$value' in child) {
      out.push({ path: [...trail, key], type: child.$type, value: child.$value });
    } else {
      walk(child, [...trail, key], out);
    }
  }
}

const kebab = (s) =>
  String(s)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_/]+/g, '-')
    .toLowerCase();

/** `Color` tokens get a `color-` segment; everything else keeps its own path. */
export function varName(token) {
  const segments = token.type === 'color' ? ['color', ...token.path] : token.path;
  return `--${PREFIX}-${segments.map(kebab).join('-')}`;
}

export const isDarkMode = (mode) => DARK_MODES.has(String(mode).toLowerCase());

/** RGB 0–255 from Figma's `components` (object or array form). */
export function rgbFrom(value) {
  const c = value.components;
  const [r, g, b] = Array.isArray(c) ? c : [c.red, c.green, c.blue];
  return [r, g, b].map((n) => Math.round(n * 255));
}
