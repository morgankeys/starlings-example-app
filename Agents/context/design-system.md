# Design system conventions

Durable styling and component conventions for the prototype in `Code/`. Load this before
editing components, styles, or anything that renders UI. Keep stack-specific detail in
`Code/ARCHITECTURE.md`.

For the token pipeline — how token CSS is generated from Figma exports, and the alpha
transform — see [`Agents/skills/design-tokens/SKILL.md`](../skills/design-tokens/SKILL.md).

## Figma sources

Two files, two jobs:

- **Site file** — the pages and features to implement: none yet. Birdy's screens were
  designed in code; `Docs/Plan.md` lists the workflows.
- **Library file** — core styles; tokens are exported from here: none yet. Until one
  exists, the token source is written by hand in Figma's variables-export format under
  `Docs/Design system/Figma tokens/unpacked/` (`Color/Light.tokens.json`,
  `Color/Dark.tokens.json`, `Primitives/Baseline.tokens.json`). A real export replaces those
  files; nothing downstream changes.

List the same links for humans in `Docs/Design system/README.md`.

## Where the look comes from

- **Color:** the Starlings palette. Light is "drawing office" (paper `#f6f2ea`, ink
  `#1d1b22`), dark is "field at dusk" (`#15141e`, apricot actions). Accents keep fixed jobs:
  teal = done/success/focus, sky = in progress/info, violet = review and everything
  AI, amber = due soon/high priority, rust = overdue/urgent/destructive. Rust is Birdy's
  addition; Starlings has no red.
- **Type:** Bricolage Grotesque for display (page titles, section headers, the greeting,
  numerals), Instrument Sans for everything else.
- **Elevation:** borders, not shadows, except floating layers (menus, popovers, dialogs,
  docked panels on small screens), which use `--bd-color-shadow-overlay`.
- **Density:** compact app UI, with 36px controls and 14px base text.

## Styling rules

**Scoped styles only.** Component styling lives in the component's own scoped style block.
No inline styles, and no global CSS outside the minimal global stylesheet and the generated
token files.

**Token variables only.** Every themed property uses a CSS custom property from the
generated token file (`Code/src/styles/tokens.generated.css`), under the namespace `--bd-*`:

- **Color**: `--bd-color-*`. Groups: `bg-*` (app, raised, sunken, and the translucent
  state layers `hover`, `pressed`, `selected`, `scrim`), `border-*`, `text-*`, `action-*`,
  `focus-ring`, `link-default`, `accent-*` (teal, violet, amber, sky, rust, neutral, each
  with a `-tint`), semantic `success-*`, `info-*`, `warning-*`, `danger-*`, `ai-*`,
  `status-*` (todo, progress, review, done), `checkbox-*`, `shadow-overlay`
- **Typography**: `--bd-font-family-{display,ui,mono}`, `--bd-font-size-{xs…4xl}`,
  `--bd-font-weight-{regular,medium,semibold,bold}`, `--bd-font-line-height-{tight,snug,normal}`,
  `--bd-font-letter-spacing-{tight,normal,wide}`
- **Shape**: `--bd-radius-{xs,sm,md,lg,xl,pill}`
- **Spacing**: `--bd-space-{0-5,1,1-5,2,2-5,3,4,5,6,8,10,12,16}` (4px scale)
- **Sizes**: `--bd-size-*` for controls, icons, avatars and layout widths
- **Motion**: `--bd-duration-{fast,normal,slow}`

Tints are for the fill behind their own accent (chips, badges, icon tiles) and never for
large surfaces.

**Discovering variable names: grep the generated CSS, never guess.** Search the generated
token files for a likely name and confirm it exists before using it. If they are gitignored,
run `tokens` first on a fresh clone.

**Never hand-edit generated token CSS.** Change the transform and rerun `tokens`.

## Handling deviations

**Never weaken lint rules to suppress design-system violations.** When `lint` or `validate`
flags a hardcoded value:

1. Check whether a suitable token exists (grep the generated token CSS).
2. If yes: use the token.
3. If no suitable token exists: leave the deviation in the backlog
   (`Docs/Design system/deviations-backlog.md`) and write your best guess of why on its
   `Rationale:` line. Leave the sentinel `Unknown — needs review` only if the reason is
   genuinely unclear; that flags it for the owner. The validator carries each rationale
   forward on the next run, so you never copy a key by hand.
4. If it's technical debt: log it the same way and add a TODO comment in the code.

The backlog is a transparent record of legitimate exceptions and work in progress, not a
place to hide violations. Its contract is in
[`Docs/Design system/design-in-code architecture.md`](../../Docs/Design%20system/design-in-code%20architecture.md).

**Run `validate` after styling changes** and review the backlog diff before committing.

## Component variants

Variant axes are exposed as `data-*` attributes on the component root, not as
component-local custom properties (which the validator flags as outside the token
namespace). Each combination is an explicit attribute-selector rule in the component's
CSS Module, for example `.button[data-variant='primary']`.

Every primitive carries `data-component="<Name>"` plus one `data-<axis>` per variant
dimension (`data-variant`, `data-size`, and so on). Because these attributes are the
styling hooks, they cannot drift from what is rendered. In DevTools,
`$$('[data-component="<Name>"]')` lists every instance.

## References

- [`Agents/skills/design-tokens/SKILL.md`](../skills/design-tokens/SKILL.md) — token
  regeneration workflow and the alpha gotcha
- [`troubleshooting/rounded-clipping.md`](troubleshooting/rounded-clipping.md) — clipping
  and layering rounded surfaces without edge fringes
- [`Docs/Design system/design-in-code architecture.md`](../../Docs/Design%20system/design-in-code%20architecture.md)
  — principles, validator contract, deviations backlog
- [`Code/ARCHITECTURE.md`](../../Code/ARCHITECTURE.md) — how this stack implements it
