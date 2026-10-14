---
name: design-tokens
description: Regenerate design tokens from a Figma variables export and run design-system validation. Use when a new Figma token export arrives, when the token transform changes, or when validating design-system compliance.
---

# Design tokens

Workflow for turning a Figma variables export into the prototype's token CSS, and checking
the result. Commands are named by role; [`Code/README.md`](../../../Code/README.md) maps
each role to this project's real command.

## When to use this skill

- A new Figma token export (`.zip`) has been added to `Docs/Design system/Figma tokens/`.
- Tokens were added, removed, or renamed in the Figma library file.
- The token transform or converter config in `Code/` changed.
- You need to validate design-system compliance before committing styling changes.

## Steps

### 1. Export from Figma

Export each variable collection from the **library file** (see
[`Agents/context/design-system.md`](../../context/design-system.md#figma-sources)) as a
`.zip`. One zip per collection.

### 2. Place the export

Drop the zips in `Docs/Design system/Figma tokens/`, replacing the previous ones with the
same names.

### 3. Run `tokens`

`tokens` does two things in order:

1. **Unpack.** Each zip expands into its own folder under
   `Docs/Design system/Figma tokens/unpacked/<collection>/`. They must not share a folder:
   several Figma collections export a file with the same name, `Baseline.tokens.json`, and
   would overwrite each other.
2. **Build.** The converter reads the unpacked JSON and writes the generated token CSS,
   whose header marks it as generated.

The unpacked JSON is **tracked in git** on purpose, so a token change shows up as a
readable diff in the pull request. The generated CSS can be ignored or tracked; the
project's `Code/ARCHITECTURE.md` says which.

### 4. Review the diff

```bash
git diff -- "Docs/Design system/Figma tokens/unpacked/"
```

Look for tokens added, removed, or renamed, values that changed, and any change to a
token with `alpha < 1`. A removed or renamed token breaks every component that used it.

### 5. Run `build`

`build` fails if the alpha regression guard finds a token that lost its alpha (see below)
or the stack cannot compile the generated CSS.

### 6. Run `validate`

`validate` scans the code for design-system deviations and rewrites
`Docs/Design system/deviations-backlog.md`. Write a `Rationale:` line for each new entry.
The backlog contract and the rules a validator checks are in
[`Docs/Design system/design-in-code architecture.md`](../../../Docs/Design%20system/design-in-code%20architecture.md).

Commit the regeneration on a `tokens/<slug>` branch, separately from any component fixes.

## Critical: the alpha gotcha

**This is the most important thing to understand about a Figma-fed token pipeline.** It
holds for every stack, and the failure is silent.

A Figma color token looks like this:

```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": { "red": 0.168, "green": 0.388, "blue": 0.545 },
    "alpha": 0.08,
    "hex": "#2B638B"
  }
}
```

**The `hex` field is 6-digit RGB only.** Opacity lives in the separate `alpha` field.

### What breaks

A transform that reads only `hex` emits a fully opaque color for every translucent token.
In a typical Material-style export that is around 150 tokens:

- every **state layer** (each color role × each hover, focus, and pressed opacity), used
  for hover, focus, and pressed overlays;
- every **surface tint** step, used for elevation.

Hover states, focus rings, scrims, and surface tints vanish or turn solid. Nothing errors.

### The fix

The color transform must branch on `alpha`:

1. `alpha === 1`: emit `hex` (e.g. `#2B638B`).
2. `alpha < 1`: emit `rgb(r g b / a)`:
   - take RGB from `components` (each float 0–1, × 255, rounded);
   - use the raw `alpha` after the slash;
   - e.g. `rgb(43 99 139 / 0.08)`.

### The regression guard

The build must include an assertion that, for every source token with `alpha < 1`, the
emitted value carries an alpha channel (`rgb(… / a)`, or an 8-digit hex). On failure it
exits non-zero and lists the offending tokens. It protects against:

- a future export changing shape and reintroducing the bug;
- a converter upgrade replacing the custom transform;
- a refactor that "simplifies" the transform.

**Never simplify, remove, or bypass the guard.** If it fails, fix the transform.

## Other gotchas

- **Only `color`, `number`, and `string` `$type`s come out of Figma.** Dimensions arrive
  as unitless `number`s; the converter decides which become `px` (spacing, radius, font
  size) and which stay unitless (font weight, line-height ratios). Typography families
  arrive as `string`s.
- **Names need normalizing.** Figma names have spaces and casing (`On Primary`). Map them to
  kebab-case under the project's namespace (`--<prefix>-color-on-primary`) and record the
  namespace in `Agents/context/design-system.md`.
- **Never hand-edit the generated CSS.** Change the transform, then rerun `tokens`.

## Troubleshooting

- **Build fails on the alpha guard.** The transform emitted a translucent token as opaque.
  Fix the color transform as above.
- **A new token does not appear in the CSS.** Check the zip is in
  `Docs/Design system/Figma tokens/`, that it unpacked into its own folder, and that the
  converter's filters (by `$type` or collection) include it.
- **Components broke after regeneration.** Run `validate` and search for the removed or
  renamed names; update components to the new tokens and validate again.
- **Validation flags a value that has no token.** Leave the deviation, write its
  `Rationale:` line, and ask the design-system owner for a token. Never weaken the lint
  rule.

## References

- [`Agents/context/design-system.md`](../../context/design-system.md) — styling rules,
  Figma sources, deviation handling
- [`Docs/Design system/design-in-code architecture.md`](../../../Docs/Design%20system/design-in-code%20architecture.md)
  — validator contract and the deviations backlog
- [`Docs/Tooling.md`](../../../Docs/Tooling.md) — token converters and linters
- [W3C Design Tokens format](https://tr.designtokens.org/format/)
