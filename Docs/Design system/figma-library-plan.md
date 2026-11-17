# Birdy Figma library plan

Target: [Starlings Example — Birdy](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=0-1). Baseline: Birdy repository `ef210a49f46a8f1c4d907253459ccf9d23ec5c1c`. The code and existing token sources are the initial authority. Do not model or reuse other design systems for this library.

## Status and gates

- **1. Inventory:** complete at the baseline above. The token sources and component table below define the initial inventory; inspect each implementation and usage again when building it.
- **2. Variables:** created in the target file. `Color` has 50 COLOR variables in Light and Dark; `Primitives` has 57 FLOAT and 3 STRING variables in Baseline. All 160 mode values, types, names, and web syntax were compared with source. Color channels and alpha matched within 0.00001; four decimal FLOATs have Figma's small floating-point representation differences, listed below. No aliases were introduced.
- **3. Export round trip:** passed on the provided exports. All 160 mode values were present with matching names and types; numeric values, RGB and alpha matched within 0.000001. The 21 translucent colors retained their intended alpha in generated CSS. The alpha guard now checks the opacity value as well as its presence; a deliberately altered opacity failed the guard in an isolated copy. The converter normalizes Figma's floating-point noise for typography, after which generated CSS matched the baseline byte for byte. `npm run build` and `npm run validate` passed; validation reported zero deviations.
- **4. Components:** in progress. Figma now contains Spinner (3 sizes), Dot (6 colors), Badge (11 tones, optional icon), Button (5 variants × 2 sizes × 4 states including loading, with leading/trailing icons and a focus ring), Input and Input / Filled (5 states each), Avatar (4 sizes × 6 colors), IconButton (2 variants × 2 sizes × 3 states, focus ring), Kbd, Tooltip, and a shared set of 24 lucide icons. A light/dark frame provides instance examples. These are initial components, not a completed library: Input width and interaction behavior need checking; AvatarStack, tooltips on controls, and remaining families are pending. Spinner uses text/default as a representative currentColor and requires contextual color and motion fidelity checks. Kbd uses `Ctrl K` because the available Instrument Sans did not render the command glyph; verify a suitable Figma fallback for macOS.
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

## Execution authority and handoff

The owner has authorized proactive work on the shared library: inspect Birdy code, make routine design decisions, edit the target Figma file, compare with the app, fix scoped issues, and update this plan without asking for routine implementation choices. Use Birdy sources rather than external design systems. Record meaningful choices, limitations and evidence below as work proceeds. Publishing the Figma library and merging a PR remain separate decisions; follow `Agents/context/git-workflow.md` for branches and remote writes.

**Resume next:** build Field, Textarea, Select and Checkbox in dependency order, reusing Input and the icon set; then check Input width and interaction behavior. Inspect existing objects before editing, preserve their IDs where possible, and verify variants and bindings in both modes. Use the Figma review frame [Birdy component review](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=19-74) and the local dev-only `/dev/components` specimens as starting points; expand coverage for cases they omit.

**Repository handoff:** PR [#11](https://github.com/morgankeys/starlings-example-app/pull/11) landed the earlier token work on `main`. This plan is tracked on `docs/birdy-figma-library` (PR [#12](https://github.com/morgankeys/starlings-example-app/pull/12)), rebuilt on `main` after #11's squash merge. PR [#13](https://github.com/morgankeys/starlings-example-app/pull/13) adds the foundations audit, text and effect styles; it merges first and this branch rebases onto it. Recheck branch, PR and working-tree state before further Git operations. Figma changes live in the target file independently of Git.

## Component checklist

Status is evidence-based: **Created** means a Figma object exists; **structural** means its properties and bindings have been audited against code; **visual** means representative app and Figma instances were compared in both themes. “Sample” or “partial” does not pass the complete gate. Node links refer to the target file; update them if objects change.

| Family | Created / Figma | Structural evidence | Visual evidence | Next work |
| --- | --- | --- | --- | --- |
| Spinner | [3 sizes](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=7-11) | Bindings checked; contextual arc colour is an override, documented on the component | Frozen browser render matches Button loading in both modes | Standalone app comparison |
| Dot | [6 colors](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=8-8) | Sample bindings checked | Both-mode examples; app comparison pending | Audit all bindings and compare sizes/colors |
| Badge | [11 tones](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=9-24), optional icon | Icon slot: boolean + swap, 14px, stroke override 1.17px, colour = tone text | Height, gap and colours match the browser; both-mode examples | Editable default label per tone |
| Button / LinkButton | [40 variants](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=19-62) | Icon / Trailing icon (boolean + swap), state=loading, Focus ring boolean; bindings audited | Widths within 1px and icon insets equal to browser for 5 specimens; loading and focus compared in both modes | Hover states against the browser |
| IconButton | [12 variants](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=21-92) | Shared Icon/* swap; md icon 16px; hover icon text/default; secondary hover bg/hover; focus ring | Computed colours, sizes and hover backgrounds match the browser | Tooltip pairing |
| Avatar / AvatarStack | [Avatar, 24 variants](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=20-78) | Full audit pending | Both-mode examples; app comparison pending | Stack, overflow, tooltip and full comparison |
| Field / Input / Textarea / Select / Checkbox | [Input](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=19-73) and [filled Input](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=22-84), five states each | Sample Input bindings checked | Input both-mode examples; app comparison pending | Remaining controls, widths and interaction |
| Breadcrumbs / Kbd / PageHeader | [Kbd](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=21-30) | Full audit pending | Kbd both-mode example; app comparison pending | Breadcrumbs, PageHeader, command glyph |
| SegmentedControl / Tabs | Not started | Pending | Pending | Build from code |
| Card | Not started | Pending | Pending | Build from code |
| Menu | Not started | Pending | Pending | Build from code |
| Popover / Tooltip / DatePicker | [Tooltip](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=21-129) | Full audit pending | Tooltip screenshot only; app comparison pending | Popover, DatePicker and behavior review |
| Dialog / SidePanel | Not started | Pending | Pending | Build from code |
| Toast / Notice | Not started | Pending | Pending | Build from code |
| EmptyState / ErrorState / Skeleton | Not started | Pending | Pending | Build from code |
| Brand and reusable icons | [24 lucide icons](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=31-74) | Every icon used by Button, Badge and IconButton in code; one 16px master each, stroke bound to text/default | Grid render checked against lucide | Logo, task/file icons and icons for later families |

## Completion criteria and open decisions

For each family, mark structural complete only after checking the code API against the Figma properties, supported variants and states, editable labels, optional content and icon swaps; audit relevant variable bindings and modes, with intentional fixed values explained. Mark visual complete only after comparing representative instances to browser specimens at matching scale in Light and Dark, covering the supported states and checking typography, dimensions, colors/opacity, icons and clipping. Record the comparison and limitations here. A family is complete only when both checks pass or a specific limitation has been explicitly accepted; a first screenshot alone is not a pass. Complete the entire agreed inventory before calling the library complete.

| Decision or gap | Current status and next action |
| --- | --- |
| Spinner color and animation | **Resolved with a documented limitation.** The arc defaults to `text/default` and each context overrides it (Button loading variants use their label colour). Figma cannot rotate a component continuously; the component shows the 0° frame and its description records the 700ms linear spin. |
| Button and Badge icons | **Resolved.** Boolean + instance-swap properties over a shared `Icon/*` set. Colour is an override on the icon's `Vector` stroke, which survives swaps. |
| Button loading and focus | **Resolved.** `state=loading` (50% opacity, 14px Spinner replacing the leading icon) takes Button to 40 variants, over the 30-variant guideline, because loading is a real state. Focus is a `Focus ring` boolean so it combines with default or hover. |
| Kbd command glyph | Instrument Sans did not render `⌘` in the current Figma environment. Find and verify a suitable fallback that preserves the code's appearance. |
| Figma versus browser behavior | Tooltip trigger/fade, native controls, motion and responsive content may not map one-to-one. Document exact gaps and evidence instead of marking unsupported behavior complete. |
| Code Connect and publishing | Assess mappings after component APIs stabilize; library publishing and PR merging are later separate decisions. |

## Export round-trip gate

1. Export the `Color` and `Primitives` collections from Figma, one ZIP per collection, with the owner. Preserve the untouched baseline and work in an isolated repository copy.
2. Start with clean export inputs and unpacked collection folders: `tokens.mjs` unpacks over existing files and does not remove obsolete modes. Check for stale and extra files explicitly.
3. Compare each source and exported leaf by collection, mode, path, type and value, including alpha and RGB; inspect mode metadata, variable scopes and normalized CSS-name collisions. Treat variable IDs and ordering as expected metadata differences. Investigate alias/export format support rather than assuming it.
4. Run `npm run tokens` in `Code/` and compare generated CSS by property and value in light and dark selectors. Check conversions: px dimensions, unitless weights and line-height, em letter spacing, ms durations, strings and the four floating-point values above. Report all added, removed, renamed or changed values.
5. Run `npm run build` and `npm run validate` in the isolated copy. The build's alpha guard must pass; compare actual alpha values against the pre-export baseline as well. Review the deviations backlog and record rationale for new entries. Do not edit generated CSS or weaken checks.
6. Resolve or explicitly review discrepancies before treating Figma as the token source or building components. Bring accepted exports and documentation into the repository as a separate reviewable token change.

## Component fidelity gate

For each family, record source props, supported variants and states, corresponding Figma properties, dependency instances and bound variables. Compare browser specimens and Figma instances at matching size in Light and Dark: geometry, spacing, typography and available fonts, color/alpha, borders, icons, clipping, and the code-supported hover, focus, selected, error, disabled and loading states. Use extra targeted specimens for combinations absent from the existing page. Audit variant definitions, bindings and styles structurally; document behavior or unit conversions that Figma cannot directly represent. Follow the actual source rather than inventing states. Keep dev specimens out of production builds.

### Progress notes

- The review frame `Birdy component review` shows initial instances in both Color modes. Structural inspection checked sample Button, Input, Badge, Dot and Spinner bindings and variant definitions. It is not yet a complete fidelity audit.
- Browser inspection of the local `/dev/components` page confirmed Button control heights, horizontal padding, gap, radius, typography and color roles. The Figma buttons were corrected to include the code's transparent one-pixel border, which affects their width. Remaining sizes, states, icons and interactions still need direct comparison.
- Spinner's initially invisible leading arc was replaced with visible vector geometry and checked in both themes. Code uses `currentColor` and continuous rotation; the Figma default uses `text/default`, so nested contextual colors and animation remain unresolved.
- IconButton includes plus icons as swappable instances; verify other icon choices, currentColor behavior, focus and tooltip against code. The sample Badge text property has a shared default across tones; labels remain editable.
- Tooltip is a static content component; code supplies hover/focus triggering and fade behavior. Kbd's macOS command glyph fallback remains unresolved.
- **Icons (2026-11-17).** The four colour- and size-specific Plus components were replaced by 24 `Icon/*` components covering every icon Button, Badge and IconButton use in code. Each is a single 16px `Vector` (lucide geometry, 1.33px stroke) bound to `text/default`. Parents set the size and override the stroke colour to stand in for `currentColor`. At 14px the stroke weight is overridden to 1.17px, matching lucide's scaled stroke: binding an instance's width to `size/icon-sm` resets a `rescale()`, so the weight is set explicitly. Colour and weight overrides both survive instance swaps.
- **Browser comparison (2026-11-17).** On `/dev/components` (light theme), five icon buttons matched Figma widths within 1px (sub-pixel text) with identical icon insets (13px md, 9px sm). Badge height, gap and colours matched. The comparison found and fixed three IconButton gaps: md icons were 14px instead of 16px; hover icons stayed `text/muted` instead of `text/default`; and secondary hover kept `bg/raised`, although the code's `:hover` rule is more specific and applies `bg/hover`.
- **Loading and focus (2026-11-17).** A loading Button measured 98.6px in the browser and 99px in Figma, with the spinner 13px from the edge, 14px wide, track `border/default`, arc the text colour, 50% opacity. Chrome's focus outline is 2px `focus/ring` at a 2px offset following the 6px radius; Figma draws it as an outside stroke on a frame offset 2px, radius 8.
