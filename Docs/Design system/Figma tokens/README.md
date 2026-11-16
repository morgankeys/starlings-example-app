# Figma tokens

Drop zone for Figma variables exports (`.zip`), one zip per collection. The `tokens`
command unpacks each zip into its own folder under `unpacked/`, which is tracked in git so
token changes are reviewable in pull requests.

Procedure: [`Agents/skills/design-tokens/SKILL.md`](../../../Agents/skills/design-tokens/SKILL.md).

## Birdy's token source

The [Birdy Figma library](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=0-1)
contains variables reconstructed from Birdy's original hand-written token sources. The
files in `unpacked/` now come from the exported ZIPs (one folder per collection, one file
per mode, color values with `components`, `alpha` and `hex`):

- `unpacked/Color/Light.tokens.json` and `Dark.tokens.json`: themed colors
- `unpacked/Primitives/Baseline.tokens.json`: spacing, radius, type, sizes, durations

Export each collection as a ZIP and run `tokens` to regenerate these files. The unpacker
does not remove stale mode files, so review the folder contents when modes change. The
initial export round-trip and remaining library work are tracked in
[`figma-library-plan.md`](../figma-library-plan.md).
