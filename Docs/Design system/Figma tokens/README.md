# Figma tokens

Drop zone for Figma variables exports (`.zip`), one zip per collection. The `tokens`
command unpacks each zip into its own folder under `unpacked/`, which is tracked in git so
token changes are reviewable in pull requests.

Procedure: [`Agents/skills/design-tokens/SKILL.md`](../../../Agents/skills/design-tokens/SKILL.md).

## Birdy's token source

There is no Figma library yet. The files in `unpacked/` were written by hand in the shape
Figma's variables export produces (one folder per collection, one file per mode, color
values with `components`, `alpha` and `hex`):

- `unpacked/Color/Light.tokens.json` and `Dark.tokens.json`: themed colors
- `unpacked/Primitives/Baseline.tokens.json`: spacing, radius, type, sizes, durations

Edit them directly until a real export arrives, then drop the export zips here and run
`tokens`. The zips will unpack over these folders.
