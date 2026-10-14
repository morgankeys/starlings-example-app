# Design system conventions

Durable styling and component conventions for the prototype in `Code/`. Load this before
editing components, styles, or anything that renders UI. Fill in the placeholders when the
project starts; keep stack-specific detail in `Code/ARCHITECTURE.md`.

For the token pipeline — how token CSS is generated from Figma exports, and the alpha
transform — see [`Agents/skills/design-tokens/SKILL.md`](../skills/design-tokens/SKILL.md).

## Figma sources

Two files, two jobs:

- **Site file** — the pages and features to implement: `<Figma link to the site file>`
- **Library file** — core styles; tokens are exported from here: `<Figma link to the library file>`

List the same links for humans in `Docs/Design system/README.md`.

## Styling rules

**Scoped styles only.** Component styling lives in the component's own scoped style block.
No inline styles, and no global CSS outside the minimal global stylesheet and the generated
token files.

**Token variables only.** Every themed property uses a CSS custom property from the
generated token files, under the project's namespace `--<prefix>-*`:

- **Color**: `--<prefix>-color-*`, including state-layer overlays
- **Typography**: font family, size, weight, line-height, letter-spacing
- **Shape**: border radius
- **Spacing**: margin, padding, gap

Record the real namespace and its groups here once the first export is in.

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
namespace). Each combination is an explicit attribute-selector rule, for example
`.icon-button[data-size="sm"] .icon-button__container`.

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
