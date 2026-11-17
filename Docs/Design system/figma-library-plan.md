# Birdy Figma library plan

Target: [Starlings Example — Birdy](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=0-1). Baseline: Birdy repository `ef210a49f46a8f1c4d907253459ccf9d23ec5c1c`. The code and existing token sources are the initial authority. Do not model or reuse other design systems for this library.

## Status and gates

- **1. Inventory:** complete at the baseline above. The token sources and component table below define the initial inventory; inspect each implementation and usage again when building it.
- **2. Variables:** created in the target file. `Color` has 50 COLOR variables in Light and Dark; `Primitives` has 57 FLOAT and 3 STRING variables in Baseline. All 160 mode values, types, names, and web syntax were compared with source. Color channels and alpha matched within 0.00001; four decimal FLOATs have Figma's small floating-point representation differences, listed below. No aliases were introduced.
- **3. Export round trip:** passed on the provided exports. All 160 mode values were present with matching names and types; numeric values, RGB and alpha matched within 0.000001. The 21 translucent colors retained their intended alpha in generated CSS. The alpha guard now checks the opacity value as well as its presence; a deliberately altered opacity failed the guard in an isolated copy. The converter normalizes Figma's floating-point noise for typography, after which generated CSS matched the baseline byte for byte. `npm run build` and `npm run validate` passed; validation reported zero deviations.
- **4. Components:** in progress. Spinner (three sizes), Dot (six colors), Badge (eleven tones), Button (30 variants), IconButton (12), Input and Input / Filled (5 states each), Avatar (24), Kbd and Tooltip exist in Figma. Spinner uses text/default as a representative currentColor and requires contextual color and motion fidelity checks. Badge's optional icon is not implemented yet. All remaining families and full fidelity review are pending.
- **Foundations follow-up (2026-11-17):** elevation, stroke-width and extra size variables, 2 effect styles and 16 text styles were added, and existing components were rebound. See [`foundations-audit.md`](foundations-audit.md). The `Primitives` collection must be exported again to bring the 17 new variables into the repository.
- **5. Fidelity and integration:** pending. Review Figma instances against the running app and update source documentation once the library is verified. Publishing and pushing are separate later actions.

## Token inventory and conventions

The exact inventory, paths, values, types, and mode data are the tracked source files [Color Light](Figma%20tokens/unpacked/Color/Light.tokens.json), [Color Dark](Figma%20tokens/unpacked/Color/Dark.tokens.json), and [Primitives Baseline](Figma%20tokens/unpacked/Primitives/Baseline.tokens.json). Each leaf maps to a Figma variable of the same slash-separated path. The converter in `Code/scripts/lib/tokens-source.mjs` adds `--bd-color-` for colors, `--bd-` otherwise, and normalizes path segments to kebab case. Figma WEB code syntax points to the resulting `var(--bd-...)`.

| Collection | Groups | Types and modes | Figma scope policy |
| --- | --- | --- | --- |
| Color | bg, border, text, action, focus, link, accent, success, info, warning, danger, ai, status, checkbox, shadow | 50 colors; Light and Dark | Text, background, stroke and effect scopes by role; multi-use semantic colors expose the relevant fill, text and stroke scopes. |
| Primitives | space, radius, font, size, duration | 57 numbers and 3 strings; Baseline | Gap, corner radius, width/height, font size and font weight as appropriate. CSS font fallback stacks, line-height ratios, em letter spacing and millisecond durations are hidden from property pickers because their values do not directly represent a Figma property. |

Figma stores the family values as the original CSS fallback strings for export; they are not single Figma font names. Instrument Sans and Bricolage Grotesque are available in Figma; styles and CSS semantics still need checking during component construction. Colors retain direct values rather than aliases because the current converter does not resolve alias references. The source has 5 translucent Light and 16 translucent Dark values.

The export returned `1.149999976158142` for `font/line-height/tight` (source 1.15), `1.350000023841858` for `font/line-height/snug` (1.35), `-0.019999999552965164` for `font/letter-spacing/tight` (-0.02), and `0.05999999865889549` for `font/letter-spacing/wide` (0.06). The converter rounds typography ratios and em letter spacing to six decimal places to suppress this noise; after regeneration the emitted CSS matches the prior baseline exactly.

## Component inventory

The UI barrel is `Code/src/components/ui/index.ts`; each named component's TSX and CSS Module are the specification. The dev-only `Code/src/routes/dev/ComponentSpecimens.tsx` provides a starting reference, not complete coverage. Behavioral providers and helpers are noted but are not themselves visual components.

| Family | Initial Figma coverage and relevant code API |
| --- | --- |
| Spinner | sm, md, lg; loading indicator and accessible label. |
| Button / LinkButton | primary, secondary, ghost, danger, ai; sm/md; label, leading/trailing icons; disabled and loading for Button. LinkButton shares appearance. |
| IconButton | ghost/secondary, sm/md, icon, disabled/focus and optional tooltip. |
| Badge / Dot | Badge neutral, success, info, warning, danger, ai, teal, violet, amber, sky, rust; optional icon. Dot's six color options. |
| Avatar / AvatarStack | xs/sm/md/lg, user color and initials; stack and overflow count, optional tooltip. |
| Field / Input / Textarea / Select / Checkbox | Labels, optional and hint/error messages; empty, filled, focus, invalid and disabled states; checkbox checked/unchecked. |
| Breadcrumbs / Kbd / PageHeader | Breadcrumb items and current item; keyboard text; heading, optional eyebrow, description, leading asset and actions. |
| SegmentedControl / Tabs | Selected and unselected items; labels, optional segment icons/icon-only, tab counts and content. |
| Card | none/md padding; optional header, icon and actions; body content. |
| Menu | Trigger and content; item default/danger/disabled, icon and shortcut; checked option, label and separator. |
| Popover / Tooltip / DatePicker | Trigger and open content; tooltip; date picker default/custom trigger, disabled, quick options and date input. PopoverClose and TooltipProvider are behavior helpers. |
| Dialog / SidePanel | Dialog sm/md, heading, description, body, footer and open state; side panel drawer/assistant widths, heading/actions/body/footer and close control. |
| Toast / Notice | Toast default/success/danger, optional description/action and close; Notice neutral/warning/ai and optional icon. ToastProvider/useToast are behavior helpers. |
| EmptyState / ErrorState / Skeleton | EmptyState sm/md, optional icon/description/action; ErrorState compact/default and retry; Skeleton sm/md/lg and line count. |
| Brand and reusable icons | `components/brand/Logo`, `features/tasks/TaskIcons` status/priority and `features/files/FileIcon` kind; use Birdy's assets and lucide icons as implemented. |

Feature-specific task, file, sharing, assistant and route compositions are deferred beyond this initial shared library. Inventory them from `Code/src/features/` and `Code/src/routes/` in the later stage rather than treating every rendered feature as a primitive.

## Export round-trip gate

1. Export the `Color` and `Primitives` collections from Figma, one ZIP per collection, with the owner. Preserve the untouched baseline and work in an isolated repository copy.
2. Start with clean export inputs and unpacked collection folders: `tokens.mjs` unpacks over existing files and does not remove obsolete modes. Check for stale and extra files explicitly.
3. Compare each source and exported leaf by collection, mode, path, type and value, including alpha and RGB; inspect mode metadata, variable scopes and normalized CSS-name collisions. Treat variable IDs and ordering as expected metadata differences. Investigate alias/export format support rather than assuming it.
4. Run `npm run tokens` in `Code/` and compare generated CSS by property and value in light and dark selectors. Check conversions: px dimensions, unitless weights and line-height, em letter spacing, ms durations, strings and the four floating-point values above. Report all added, removed, renamed or changed values.
5. Run `npm run build` and `npm run validate` in the isolated copy. The build's alpha guard must pass; compare actual alpha values against the pre-export baseline as well. Review the deviations backlog and record rationale for new entries. Do not edit generated CSS or weaken checks.
6. Resolve or explicitly review discrepancies before treating Figma as the token source or building components. Bring accepted exports and documentation into the repository as a separate reviewable token change.

## Component fidelity gate

For each family, record source props, supported variants and states, corresponding Figma properties, dependency instances and bound variables. Compare browser specimens and Figma instances at matching size in Light and Dark: geometry, spacing, typography and available fonts, color/alpha, borders, icons, clipping, and the code-supported hover, focus, selected, error, disabled and loading states. Use extra targeted specimens for combinations absent from the existing page. Audit variant definitions, bindings and styles structurally; document behavior or unit conversions that Figma cannot directly represent. Follow the actual source rather than inventing states. Keep dev specimens out of production builds.
