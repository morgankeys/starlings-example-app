# Foundations audit: spacing, radius, elevation, typography

Audit of how Birdy's code uses its spacing, corner-radius, shadow and type foundations, what
the [Birdy Figma library](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=0-1)
captures, and the usage rules we should adopt before tightening validation.

- **Date:** 2026-11-17
- **Code scope:** all 68 stylesheets under `Code/src/` (2,648 declarations). There are no
  inline `style={{}}` props.
- **Figma scope:** the library file's two variable collections and its components.
- **Method:** a PostCSS pass over every declaration, plus a read of the Figma file's
  variables, styles and component bindings.

## Status

| Step                                                                     | State                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Audit (this document)                                                    | Done                                                                 |
| Figma capture: variables, effect styles, text styles, component bindings | Done (see [Figma capture](#figma-capture))                           |
| Converter: elevation composition and type classes                        | Done; type classes generated in `Code/src/styles/type.generated.css` |
| New Primitives export into the repo | Done (2026-11-17) |
| Code migration to elevation, stroke, size and type tokens | Done: 9 shadows, 67 widths and offsets, 15 sizes, 107 rules on `composes`, 6 element or variant rules on the style's primitives |
| Type style names | Approved (renamed in Figma by the owner) |
| Validation and lint rules                                                | Next phase                                                           |

## Summary

| Foundation             | Tokens in code    | Used consistently in code?            | In Figma                                                                   | Main gap                                                                   |
| ---------------------- | ----------------- | ------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Spacing                | 13-step 4px scale | Yes: 404 declarations, all tokens     | 13 variables, bound on components                                          | No role rules. Space tokens also used as dimensions.                       |
| Corner radius          | 6 steps           | Yes: 93 declarations, all tokens      | 6 variables, bound on components                                           | Roles are implicit, with a few inconsistent picks                          |
| Elevation              | 1 color only      | Shadow geometry hardcoded in 9 places | Color variable only, no effect styles                                      | No elevation tokens or styles at all                                       |
| Typography             | 21 primitives     | Primitives yes; combinations ad hoc   | Size and weight variables. No text styles. Components use raw type values. | No type ramp: 34 distinct combinations, and headings fight global defaults |
| Stroke width (related) | none              | 1px and 2px hardcoded about 60 times  | none                                                                       | No border, focus-ring or indicator width tokens                            |

Today `npm run validate` reports **0 deviations** and stylelint passes. That is accurate for
the rules we have. But neither tool checks `box-shadow` geometry, border or outline widths,
or spacing tokens used as sizes. Neither checks whether a group of type declarations matches
an approved style. Those are the gaps to close in the validation phase.

---

## 1. Spacing

### What the code does

The scale runs on a 4px base. Counts are declarations that use each token in `margin`,
`padding` or `gap`.

| Token       | px  | Uses |     | Token      | px  | Uses |
| ----------- | --- | ---- | --- | ---------- | --- | ---- |
| `space-0-5` | 2   | 18   |     | `space-5`  | 20  | 30   |
| `space-1`   | 4   | 54   |     | `space-6`  | 24  | 13   |
| `space-1-5` | 6   | 46   |     | `space-8`  | 32  | 9    |
| `space-2`   | 8   | 134  |     | `space-10` | 40  | 3    |
| `space-2-5` | 10  | 34   |     | `space-12` | 48  | 2    |
| `space-3`   | 12  | 73   |     | `space-16` | 64  | 2    |
| `space-4`   | 16  | 46   |     |            |     |      |

- Every spacing declaration resolves to a token. The only `calc()` uses are two negative
  margins: the Avatar stack overlap and a TaskPanel optical offset. Both are legitimate.
- `space-2` (8px) is the workhorse, and the UI is compact. Steps from `space-8` up appear
  only in page and empty-state layout.
- **Misuse: spacing tokens used as dimensions** (14 declarations). Examples: dot sizes in
  `Badge.module.css:58` and `NotificationBell.module.css:137`, the task event dot in
  `TaskPanel.module.css:210`, skeleton and empty-state line heights in
  `States.module.css:89,104,112` and `MessageContent.module.css:60`, and the progress bar
  height in `ProjectsPage.module.css:50`. Figma copies the same mistake: Dot binds
  `space/2` to its width and height.
- **Misuse: borrowed size tokens.** Badge and Kbd take their height from
  `size-avatar-xs` (20px), in code and in Figma. Changing avatar sizes would silently
  resize badges.
- One raw 2px sits inside a `calc()`: `SegmentedControl.module.css:15`, which
  compensates for the group border. Stylelint ignores every `calc()`. The validator
  flags raw lengths in `calc()` only for spacing properties, and this one is a `height`.

### Figma

All 13 `space/*` variables exist with the Gap scope, which covers auto-layout gap and
padding. Badge, Button, Input, Kbd and Tooltip bind padding and gap to them. **Spacing is
captured.** Only the misuses above need fixing.

### Dos and don'ts

- **Do** use whole steps (`1`, `2`, `3`, `4`, `5`, `6`, `8` and up) for layout: gaps
  between cards, sections, page gutters and stacks.
- **Do** keep half steps (`0-5`, `1-5`, `2-5`) for component internals: control padding,
  icon-to-label gaps, chip insets. Don't use them for layout between components.
- **Do** match padding to control size: sm controls use `space-2` horizontally, md controls
  use `space-2-5` or `space-3`. Copy the existing Button, Input and IconButton values. Don't
  invent new ones.
- **Do** use `gap` on flex or grid parents rather than margins on children. Use margins only
  for one-off optical offsets, and say why in a comment.
- **Don't** use `space-*` for `width`, `height`, `top` or `left` sizing of an element. Use a
  `size-*` token (`size/dot-*`, `size/progress-bar`, `size/skeleton-*`,
  `size/control-xs`), and add one if none fits. Offsets for absolutely positioned children
  (`top`, `right`) may use space tokens, because they are distances.
- **Don't** borrow another component's size token (`size-avatar-xs` for Badge height). Add
  a shared `size/control-xs` (20px) instead.
- **Don't** hide raw pixels in `calc()`. Use a stroke-width token (see section 5).

---

## 2. Corner radius

### What the code does

The roles are consistent and readable once written down:

| Token         | px  | Role                                        | Examples                                                                      |
| ------------- | --- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `radius-xs`   | 4   | Items nested inside a container; tiny chips | Menu items, segmented segment, Kbd, tooltip, context chips, toast action      |
| `radius-sm`   | 6   | Interactive controls and list rows          | Button, IconButton, Field, DatePicker trigger, sidebar items, search          |
| `radius-md`   | 8   | Anchored overlays and medium surfaces       | Menu, Popover, Toast, task rows and board cards, notices, assistant input     |
| `radius-lg`   | 10  | Content cards and containers                | Card, board columns, tables, tiles, people and project cards, bulk action bar |
| `radius-xl`   | 14  | Modal surfaces                              | Dialog, command palette, sign-in card                                         |
| `radius-pill` | 999 | Fully round shapes                          | Avatar, Badge, Dot, counts, spinner, progress bar, task checkbox              |

The nesting rule holds: an inner radius steps down one level when padding is small (Menu
`md` with items `xs`; SegmentedControl group `sm` with segments `xs`; board column `lg`
with cards `md`).

**Inconsistencies to decide:**

- Toast (`md`) and BulkActionBar (`lg`) are both floating bars with the same shadow but
  different radii.
- `FocusCard.badge` uses `sm` while every other badge is `pill`.
- AssistantPanel chat bubbles are `lg` but the suggestion buttons beside them are `md`.
  That may be intentional: bubbles are content and suggestions are controls.

### Figma

All 6 `radius/*` variables exist with the Corner radius scope, and every built component
binds them. **Radius is captured.** Only the role guidance is missing.

### Dos and don'ts

- **Do** pick a radius by role (table above), not by eye.
- **Do** step down one level for a surface nested inside another with less than about 8px
  of padding between them.
- **Do** use `pill` only for shapes meant to be fully round or capsule-shaped.
- **Don't** give a floating layer a radius from a different tier than its siblings: anchored
  overlays are `md`, modals are `xl`.
- **Don't** set one-off radii (`border-top-left-radius` and so on) for clipping. See
  `Agents/context/troubleshooting/rounded-clipping.md`.

---

## 3. Elevation (shadows)

### What the code does

The documented rule is "borders, not shadows, except floating layers". The code follows it:
there are only 10 `box-shadow` declarations. But the geometry is hardcoded, and two
implicit levels have emerged:

| Implicit level | Value                                         | Used by                                                                                             |
| -------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Overlay, small | `0 8px 24px var(--bd-color-shadow-overlay)`   | Menu, Popover, Toast, BulkActionBar                                                                 |
| Overlay, large | `0 16px 48px var(--bd-color-shadow-overlay)`  | Dialog, CommandPalette, SidePanel (≤1100px), stacked drawer in AppShell (<1800px), Sidebar (mobile) |
| Not elevation  | `inset 0 -2px 0 var(--bd-color-text-default)` | Selected-tab underline in `Tabs.module.css:32`                                                      |

- `--bd-color-shadow-overlay` is themed: 14% ink in Light, 45% black in Dark. That part is
  done well.
- Tooltip has no shadow, which is fine for a small dark chip. Make that explicit in the
  rules.
- The validator does not flag the raw `8px 24px` or `16px 48px`, because its
  `hardcoded-color` rule looks only for literal colors in `box-shadow`, and there is no
  shadow-geometry rule.

### Figma

There is only the `shadow/overlay` color variable (Effect color scope). There are **no
effect styles**, and no built component has an effect. **Elevation is not captured.**

### Proposed tokens

| Figma                               | CSS                         | Value                            |
| ----------------------------------- | --------------------------- | -------------------------------- |
| Effect style `elevation/overlay-sm` | `--bd-elevation-overlay-sm` | `0 8px 24px` + `shadow/overlay`  |
| Effect style `elevation/overlay-lg` | `--bd-elevation-overlay-lg` | `0 16px 48px` + `shadow/overlay` |

The effect styles bind their y offset, blur and color to variables, so the values stay
round-trippable. Figma's variables export does not include effect styles. So the pipeline
has FLOAT variables `elevation/<level>/{y,blur}`, and the converter composes them into one
`--bd-elevation-<level>` value. The color comes from `shadow/<level without its size suffix>`,
so `overlay-sm` uses `--bd-color-shadow-overlay`.

### Dos and don'ts

- **Do** separate resting surfaces with `border-default` and background steps (`bg-app`,
  `bg-raised`, `bg-sunken`), not shadows.
- **Do** use `elevation-overlay-sm` for anchored floating layers: menus, popovers, toasts,
  floating action bars.
- **Do** use `elevation-overlay-lg` for modal or docked layers that cover content: dialogs, the
  command palette, drawers and panels on small screens.
- **Do** pair every shadow with a border. In Dark mode the shadow is nearly invisible
  against the dusk background, and the border carries the edge.
- **Don't** add a shadow to cards, rows, hover states or focus states.
- **Don't** use `box-shadow` for indicators (tab underline) or focus rings. Use a border or
  outline with a stroke-width token.
- **Don't** write shadow geometry by hand. Use the composite token only.

---

## 4. Typography

### What the code does

The primitives are used everywhere: no raw sizes, weights or families. Body text inherits
Instrument Sans at 14px and line height 1.5 from `body`. `h1` to `h4` inherit Bricolage,
semibold, tight line height and tight tracking from `global.css`.

But there is **no type ramp**. The 125 rules that set `font-size` produce **34 distinct
combinations** of family, size, weight, line height, tracking and case. Each component
assembles its own. Two side effects:

1. **Headings fight the global defaults.** Nine rules reset `h2`/`h3` elements back to the UI
   family and normal tracking (`letter-spacing-normal` + `family-ui`), because the element
   was chosen for semantics but the look wanted was a UI title. Examples:
   `FilePanel.sectionTitle`, `TaskGroups.heading`, `ShareDialog.heading`, `Card.title`.
2. **The same role is spelled differently.** For example, a small section title appears as
   `ui sm` (weight inherited from `h3`), as `ui sm semibold` and as `display sm semibold`.

Usage by primitive:

- **Sizes:** `sm` 69, `xs` 30, `md` 9, `xl` 6, `lg` 5, `3xl` 3, `2xl` 2, `4xl` **0**.
- **Weights:** `medium` 37, `semibold` 25, `regular` 2, `bold` 1 (logo only).
- **Unused:** `font-size-4xl` and `duration-slow`. `font-family-mono` was unused until
  Kbd adopted `label/mono`.

### Proposed type ramp

These styles are derived from the combinations that actually occur. The adopted set (17 styles,
grouped by role: `display/` names content in Bricolage, `heading/` structures the interface in
Instrument Sans, caption sits under `body/`)
lives in [`type-styles.json`](type-styles.json). Each row replaces the
ad hoc combinations listed under it.

| Style             | Family  | Size   | Weight   | Line height | Tracking        | Replaces                                                                       |
| ----------------- | ------- | ------ | -------- | ----------- | --------------- | ------------------------------------------------------------------------------ |
| `display/page`    | display | 3xl 28 | semibold | tight       | tight           | PageHeader title, sign-in title                                                |
| `display/panel`   | display | 2xl 22 | semibold | tight       | tight           | TaskPanel title                                                                |
| `display/section` | display | xl 18  | semibold | tight       | tight           | Dialog title, assistant welcome, FilePanel name, doc `h2`                      |
| `display/card`    | display | lg 16  | semibold | tight       | tight           | Project and team card names, FocusCard and thread-history headings             |
| `heading/md`        | ui      | md 14  | semibold | snug        | normal          | Card title, notifications title, assistant title                               |
| `heading/sm`        | ui      | sm 13  | semibold | snug        | normal          | Section titles in panels, groups and dialogs; board column heading; bulk count |
| `body/md`         | ui      | md 14  | regular  | normal      | normal          | `body`, dialog description, menu item                                          |
| `body/sm`         | ui      | sm 13  | regular  | normal      | normal          | Secondary text (about 50 uses)                                                 |
| `body/sm-compact` | ui      | sm 13  | regular  | snug        | normal          | Notification excerpt, multi-line text in tight containers                      |
| `label/md`        | ui      | md 14  | medium   | tight       | normal          | Button                                                                         |
| `label/sm`        | ui      | sm 13  | medium   | snug        | normal          | Field label, segmented control, chips                                          |
| `label/xs`        | ui      | xs 12  | medium   | tight       | normal          | Badge, table header                                                            |
| `body/caption`         | ui      | xs 12  | regular  | snug        | normal          | Counts, metadata, tooltips (about 20 uses)                                     |
| `heading/overline`        | ui      | xs 12  | semibold | tight       | wide, uppercase | Sidebar, menu, command palette and notification group labels                   |
| `label/mono`         | mono    | xs 12  | medium   | tight       | normal          | Kbd keyboard shortcuts, in DM Mono            |

The remaining one-offs (Logo wordmark, Avatar initials, FocusCard number) stay
component-specific. They should still use primitives.

### Figma

`font/size/*` and `font/weight/*` exist as scoped variables. Family, line-height and
letter-spacing variables exist but are hidden from pickers, because their values are CSS
stacks, unitless ratios and em values. There are **no text styles**. The built components
(Badge, Button, Input, Avatar, Kbd, Tooltip) set font size, line height and tracking as
**raw values**, not bound to variables. **Typography is not captured** beyond the
primitives.

What Figma can represent: a text style can bind font size and weight to the existing
variables. Line height and letter spacing must be stored on the style as percentages
(115%, 135%, 150%; -2%, 6%), because binding a variable to those fields means pixels.
Family is the font name itself, not the CSS fallback stack.

### Dos and don'ts

- **Do** choose a type style by role from the ramp, not by assembling primitives. Use
  `display/*` for the name of a piece of content (a page, a task, a dialog's subject, a
  project on a card), and `heading/*` for interface structure (a card or popover header, a
  sub-section, a nav group).
- **Do** choose the HTML element for document structure (`h1` to `h4`) and the type style
  for appearance. The two are independent.
- **Do** use Bricolage (display) only for page, panel, section and card headings, and for
  numerals meant as display. Everything interactive uses Instrument Sans.
- **Do** use tight line height only for single-line text (titles, labels, badges). Use snug
  or normal for anything that can wrap.
- **Do** use `heading/overline` (uppercase, wide tracking) only for group labels in navigation and
  menus.
- **Don't** reset heading defaults in components (`letter-spacing-normal` +
  `family-ui` on an `h3`). Apply the `heading/*` style instead.
- **Don't** use `bold` outside the logo, or `4xl` until a design calls for it.
- **Don't** set `font-weight` alone to create emphasis in a new place. Use a `Label` or
  `Title` style.

---

## 5. Related gap: stroke widths

This is outside the requested scope, but it is the same kind of raw value and it blocks a
"no raw values" lint. About 60 declarations hardcode `1px` borders (`border`,
`border-top`, `border-bottom` and similar), and several hardcode 2px: Spinner border, focus
outlines in `global.css:67` and `MembersTab.module.css:91`, the Avatar ring, the tab
underline, `outline-offset`, and `text-underline-offset: 3px` in Toast.

Added: `stroke/default` 1, `stroke/strong` 2, `stroke/focus-ring` 2 and
`stroke/focus-offset` 2, plus `font/underline-offset` 3, as Primitives variables. In Figma
the first three bind to Stroke weight; the offsets are hidden from pickers.

---

## Figma capture

Done in the library file on 2026-11-17.

| Item                                                                | Result                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `space/*`, `radius/*`, `font/size`, `font/weight`, `shadow/overlay` | Already captured; unchanged                                                                                                                                                                                                                                                                                                                                                                                                                |
| New Primitives variables (17)                                       | `elevation/overlay-{sm,lg}/{y,blur}`; `stroke/{default,strong,focus-ring,focus-offset}`; `font/underline-offset`; `size/{control-xs,dot-sm,dot-md,progress-bar,skeleton-sm,skeleton-md,skeleton-lg,skeleton-inline}`. Each has scopes, WEB code syntax and a usage description. Primitives now has 77 variables.                                                                                                                           |
| Effect styles (2)                                                   | `elevation/overlay-sm` and `elevation/overlay-lg`. The y offset, blur and color are bound to variables.                                                                                                                                                                                                                                                                                                                                    |
| Text styles (17)                                                    | One per row of [`type-styles.json`](type-styles.json), including `label/mono` (DM Mono) added for Kbd. Font size and weight are bound to `font/size/*` and `font/weight/*`. Line height and tracking are stored as percentages, and family as the font name, because Figma binds those fields to pixel values or font names and our variables hold ratios, em values and CSS stacks. Each description gives usage, tokens and the CSS class.                                               |
| Components                                                          | Text styles applied where they match code exactly: Badge (`label/xs`), Button (`label/md`, `label/sm`), Input and Input / Filled (`body/md`). Tooltip, Avatar and Kbd text now bind size and weight variables but keep their own line heights until code migrates. 56 borders bind `stroke/default` or `stroke/strong`. Badge and Kbd heights moved from `size/avatar-xs` to `size/control-xs`; Dot moved from `space/2` to `size/dot-md`. |

The library also contains Button, Input, Avatar, Kbd, IconButton and Tooltip, which
`figma-library-plan.md` now lists.

## Pipeline and validation follow-ups

These come after the Figma capture, in the validation phase.

1. **Code migration** (done): replace the 9 hardcoded shadows with
   `--bd-elevation-*`, raw border and outline widths with `--bd-stroke-*`, spacing tokens
   used as sizes with `--bd-size-*`, and component type declarations with `.bd-type-*`
   classes (applied in markup or with `composes: … from global`). Review the line-height
   changes listed in the appendix.
2. **Validator rules to add** (keep the existing ids stable):
   - `raw-shadow`: any `box-shadow` that is not a single `--bd-elevation-*` token, or `none`.
   - `raw-stroke-width`: a raw width in `border*`, `outline`, `outline-offset` or
     `text-underline-offset`.
   - `space-as-size`: a `--bd-space-*` token in `width`, `height`, `min-*` or `max-*`.
   - `raw-length-in-calc`: a raw px value inside `calc()` in any foundation property.
   - `off-ramp-typography`: a rule whose font declarations don't match a ramp style, once the
     ramp exists in code.
3. **Stylelint:** add `box-shadow` and the width properties to
   `declaration-strict-value`. Stop exempting `calc()` wholesale.
4. **Removal candidates:** `font-size-4xl` and `duration-slow`. Remove them in Figma first, then regenerate.

## Decisions

1. **Elevation:** two levels, `overlay-sm` and `overlay-lg`. Toast (`md`) and BulkActionBar
   (`lg`) keep different radii; both are already steps in the radius scale.
2. **Type:** the reviewed source is [`type-styles.json`](type-styles.json). It produces Figma
   text styles bound to the primitive variables, and CSS classes `.bd-type-<style>` in
   `Code/src/styles/type.generated.css`, built by `npm run tokens`.
3. **Type style names and Kbd:** styles are grouped by role. `display/*` (page, panel, section,
   card) names content in Bricolage; `heading/*` (md, sm, overline) structures the interface in
   Instrument Sans; `body/*` is reading text, including `body/caption`; `label/*` sits on controls
   and chips. A typography specimen page in the Figma library shows every style beside an
   example. Kbd uses `label/mono` in DM Mono, set as the first family in `font/family/mono`.
   Table column headers use `label/sm` everywhere.
4. **Stroke widths:** included.

## Appendix: type mapping

Every rule that sets a font size, plus classes applied to `h1` to `h4`, resolved to its
effective settings (explicit values, then heading or body defaults) and matched to a type
style. "Changes" lists what adopting the style would alter. Most are line height only:
labels move to tight, titles to snug.

The `global.css` heading defaults (`h1` to `h4`) are not a style. Once components use the
classes, they should stop implying a look: reset headings to inherit, so the class decides.

| Component          | Selector                          | Style             | Match   | Change on adoption                                                  |
| ------------------ | --------------------------------- | ----------------- | ------- | ------------------------------------------------------------------- |
| CommandPalette     | `.input`                          | `body/lg`         | exact   | none                                                                |
| Dialog             | `.description`                    | `body/md`         | exact   | none                                                                |
| Menu               | `.item`                           | `body/md`         | exact   | none                                                                |
| NotificationBell   | `.sentence`                       | `body/md-compact` | exact   | none                                                                |
| AssistantPanel     | `.thinking`                       | `body/sm`         | exact   | none                                                                |
| Breadcrumbs        | `.list`                           | `body/sm`         | exact   | none                                                                |
| CommandPalette     | `.hint`                           | `body/sm`         | exact   | none                                                                |
| CommandPalette     | `.empty`                          | `body/sm`         | exact   | none                                                                |
| DatePicker         | `.custom`                         | `body/sm`         | exact   | none                                                                |
| DemoPanel          | `.intro`                          | `body/sm`         | exact   | none                                                                |
| DocPreview         | `.doc`                            | `body/sm`         | exact   | none                                                                |
| Field              | `.hint, .error`                   | `body/sm`         | exact   | none                                                                |
| FilePanel          | `.meta, .muted`                   | `body/sm`         | exact   | none                                                                |
| FilePanel          | `.details`                        | `body/sm`         | exact   | none                                                                |
| FilePickerDialog   | `.when`                           | `body/sm`         | exact   | none                                                                |
| FilesPage          | `.count`                          | `body/sm`         | exact   | none                                                                |
| FilesPage          | `.table td`                       | `body/sm`         | exact   | none                                                                |
| FocusCard          | `.reason`                         | `body/sm`         | exact   | none                                                                |
| HomePage           | `.teamCount`                      | `body/sm`         | exact   | none                                                                |
| InviteMemberDialog | `.formError`                      | `body/sm`         | exact   | none                                                                |
| MembersTab         | `.note`                           | `body/sm`         | exact   | none                                                                |
| MembersTab         | `.muted`                          | `body/sm`         | exact   | none                                                                |
| MembersTab         | `.error`                          | `body/sm`         | exact   | none                                                                |
| MessageContent     | `.sub`                            | `body/sm`         | exact   | none                                                                |
| PageHeader         | `.eyebrow`                        | `body/sm`         | exact   | none                                                                |
| PeoplePage         | `.title, .teams`                  | `body/sm`         | exact   | none                                                                |
| PersonPage         | `.details`                        | `body/sm`         | exact   | none                                                                |
| PersonPage         | `.muted`                          | `body/sm`         | exact   | none                                                                |
| ProjectsPage       | `.description`                    | `body/sm`         | exact   | none                                                                |
| QuickAdd           | `.token`                          | `body/sm`         | exact   | none                                                                |
| SettingsPage       | `.note`                           | `body/sm`         | exact   | none                                                                |
| ShareDialog        | `.sub`                            | `body/sm`         | exact   | none                                                                |
| ShareDialog        | `.level`                          | `body/sm`         | exact   | none                                                                |
| SidePanel          | `.title`                          | `body/sm`         | exact   | none                                                                |
| Sidebar            | `.empty`                          | `body/sm`         | exact   | none                                                                |
| SignInPage         | `.divider`                        | `body/sm`         | exact   | none                                                                |
| SignInPage         | `.personRole`                     | `body/sm`         | exact   | none                                                                |
| States             | `.errorMessage`                   | `body/sm`         | exact   | none                                                                |
| States             | `.notice`                         | `body/sm`         | exact   | none                                                                |
| SuggestedTasks     | `.picker`                         | `body/sm`         | exact   | none                                                                |
| TaskBoard          | `.count`                          | `body/sm`         | exact   | none                                                                |
| TaskBoard          | `.empty`                          | `body/sm`         | exact   | none                                                                |
| TaskBoard          | `.due`                            | `body/sm`         | exact   | none                                                                |
| TaskPanel          | `.propLabel`                      | `body/sm`         | exact   | none                                                                |
| TaskPanel          | `.muted`                          | `body/sm`         | exact   | none                                                                |
| TaskPanel          | `.event`                          | `body/sm`         | exact   | none                                                                |
| TaskPanel          | `.commentBody`                    | `body/sm`         | exact   | none                                                                |
| TaskRow            | `.due`                            | `body/sm`         | exact   | none                                                                |
| TasksView          | `.search input`                   | `body/sm`         | exact   | none                                                                |
| TeamPage           | `.muted`                          | `body/sm`         | exact   | none                                                                |
| TeamsPage          | `.description`                    | `body/sm`         | exact   | none                                                                |
| Toast              | `.description`                    | `body/sm`         | exact   | none                                                                |
| WorkspaceSettings  | `.note`                           | `body/sm`         | exact   | none                                                                |
| NotificationBell   | `.excerpt`                        | `body/sm-compact` | exact   | none                                                                |
| ActivityFeed       | `.time`                           | `body/caption`         | exact   | none                                                                |
| AssistantPanel     | `.context`                        | `body/caption`         | exact   | none                                                                |
| AssistantPanel     | `.disclaimer`                     | `body/caption`         | exact   | none                                                                |
| FileList           | `.meta`                           | `body/caption`         | exact   | none                                                                |
| FilesPage          | `.sub`                            | `body/caption`         | exact   | none                                                                |
| Menu               | `.shortcut`                       | `body/caption`         | exact   | none                                                                |
| NotificationBell   | `.time`                           | `body/caption`         | exact   | none                                                                |
| PeoplePage         | `.teams`                          | `body/caption`         | exact   | none                                                                |
| ProjectsPage       | `.meta`                           | `body/caption`         | exact   | none                                                                |
| QuickAdd           | `.hint`                           | `body/caption`         | exact   | none                                                                |
| Sidebar            | `.plan`                           | `body/caption`         | exact   | none                                                                |
| Sidebar            | `.count`                          | `body/caption`         | exact   | none                                                                |
| Sidebar            | `.userTitle`                      | `body/caption`         | exact   | none                                                                |
| Tabs               | `.count`                          | `body/caption`         | exact   | none                                                                |
| TaskBoard          | `.meta`                           | `body/caption`         | exact   | none                                                                |
| TaskPanel          | `.when`                           | `body/caption`         | exact   | none                                                                |
| TaskRow            | `.meta`                           | `body/caption`         | exact   | none                                                                |
| TeamsPage          | `.stat`                           | `body/caption`         | exact   | none                                                                |
| ThreadHistory      | `.meta`                           | `body/caption`         | exact   | none                                                                |
| Tooltip            | `.content`                        | `body/caption`         | changes | line height snug → normal                                           |
| FocusCard          | `.title`                          | `display/card`    | exact   | none                                                                |
| ProjectsPage       | `.name`                           | `display/card`    | changes | line height normal → tight; tracking normal → tight                 |
| TeamsPage          | `.name`                           | `display/card`    | changes | line height normal → tight; tracking normal → tight                 |
| ThreadHistory      | `.heading`                        | `display/card`    | exact   | none                                                                |
| PageHeader         | `.title`                          | `display/page`    | exact   | none                                                                |
| SignInPage         | `.title`                          | `display/page`    | exact   | none                                                                |
| TaskPanel          | `.title`                          | `display/panel`   | changes | tracking normal → tight                                             |
| AssistantPanel     | `.welcomeTitle`                   | `display/section` | exact   | none                                                                |
| Dialog             | `.title`                          | `display/section` | exact   | none                                                                |
| DocPreview         | `.doc h2`                         | `display/section` | changes | line height normal → tight                                          |
| FilePanel          | `.name`                           | `display/section` | exact   | none                                                                |
| PersonPage         | `.heading`                        | `display/section` | exact   | none                                                                |
| Button             | `.button`                         | `label/md`        | exact   | none                                                                |
| Button             | `.button[data-size='sm']`         | `label/sm`        | exact   | none                                                                |
| DemoPanel          | `.trigger`                        | `label/sm`        | changes | line height normal → tight                                          |
| DemoPanel          | `.label`                          | `label/sm`        | changes | line height normal → tight                                          |
| Field              | `.label`                          | `label/sm`        | changes | line height normal → tight                                          |
| FilePanel          | `.askText`                        | `label/sm`        | changes | line height normal → tight                                          |
| FilesPage          | `.tab`                            | `label/sm`        | changes | line height normal → tight                                          |
| MembersTab         | `.table th`                       | `label/sm`        | changes | line height normal → tight                                          |
| MessageContent     | `.chip`                           | `label/sm`        | changes | line height snug → tight                                            |
| SegmentedControl   | `.segment`                        | `label/sm`        | changes | line height normal → tight                                          |
| SuggestedTasks     | `.chip`                           | `label/sm`        | changes | line height normal → tight                                          |
| Badge              | `.badge`                          | `label/xs`        | exact   | none                                                                |
| FilesPage | `.table th` | `label/sm` | changes | size xs → sm; line height normal → tight (matches the members table) |
| NotificationBell   | `.badge`                          | `label/xs`        | changes | weight semibold → medium                                            |
| Avatar             | `.avatar`                         | one-off           | —       | Component-specific; keep on primitives                              |
| Avatar             | `.avatar[data-size='xs']`         | one-off           | —       | Component-specific; keep on primitives                              |
| Avatar             | `.avatar[data-size='md']`         | one-off           | —       | Component-specific; keep on primitives                              |
| Avatar             | `.avatar[data-size='lg']`         | one-off           | —       | Component-specific; keep on primitives                              |
| ComponentSpecimens | `.name`                           | one-off           | —       | Component-specific; keep on primitives                              |
| FocusCard          | `.number`                         | one-off           | —       | Component-specific; keep on primitives                              |
| Kbd | `.kbd` | `label/mono` | changes | family ui → mono; weight regular → medium |
| Logo               | `.wordmark`                       | one-off           | —       | Component-specific; keep on primitives                              |
| Logo               | `.logo[data-size='lg'] .wordmark` | one-off           | —       | Component-specific; keep on primitives                              |
| CommandPalette     | `.group`                          | `heading/overline`        | changes | line height normal → tight                                          |
| Menu               | `.label`                          | `heading/overline`        | changes | line height normal → tight                                          |
| NotificationBell   | `.groupTitle`                     | `heading/overline`        | exact   | none                                                                |
| Sidebar            | `.heading`                        | `heading/overline`        | changes | line height normal → tight                                          |
| AssistantPanel     | `.title`                          | `heading/md`        | changes | line height normal → snug                                           |
| Card               | `.title`                          | `heading/md`        | changes | line height tight → snug                                            |
| DocPreview         | `.doc h3`                         | `heading/md`        | changes | line height normal → snug                                           |
| NotificationBell   | `.title`                          | `heading/md`        | changes | line height tight → snug                                            |
| BulkActionBar      | `.count`                          | `heading/sm`        | changes | line height normal → snug                                           |
| FilePanel          | `.sectionTitle`                   | `heading/sm`        | changes | line height tight → snug                                            |
| ShareDialog        | `.heading`                        | `heading/sm`        | changes | line height tight → snug                                            |
| TaskBoard          | `.heading`                        | `heading/sm`        | changes | line height tight → snug                                            |
| TaskGroups         | `.heading`                        | `heading/sm`        | changes | line height tight → snug                                            |
| TaskPanel          | `.sectionTitle`                   | `heading/sm`        | changes | line height tight → snug                                            |
