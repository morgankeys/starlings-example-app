# Foundations audit: spacing, radius, elevation, typography

Audit of how Birdy's code uses its spacing, corner-radius, shadow and type foundations, what
the [Birdy Figma library](https://www.figma.com/design/9Ap4SKUn0163nGwGI42yz7/Starlings-Example---Birdy?node-id=0-1)
captures, and the usage rules we should adopt before tightening validation.

- **Date:** 2026-11-17
- **Code scope:** all 68 stylesheets under `Code/src/` (2,648 declarations). There are no
  inline `style={{}}` props.
- **Figma scope:** the library file's two variable collections and its components.
- **Method:** a PostCSS pass over every declaration, plus a read of the Figma file's
  variables, styles and component bindings. No files or Figma nodes were changed.

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
  `size-*` token, and add one (for example `size/dot`, `size/indicator`,
  `size/skeleton-line`) if none fits. Offsets for absolutely positioned children
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

| Figma                               | CSS                      | Value                            |
| ----------------------------------- | ------------------------ | -------------------------------- |
| Effect style `Elevation/Overlay sm` | `--bd-shadow-overlay-sm` | `0 8px 24px` + `shadow/overlay`  |
| Effect style `Elevation/Overlay lg` | `--bd-shadow-overlay-lg` | `0 16px 48px` + `shadow/overlay` |

The effect styles bind their y offset, blur and color to variables, so the values stay
round-trippable. Figma's variables export does not include effect styles. So the pipeline
needs FLOAT variables (for example `shadow/overlay-sm/y` and `shadow/overlay-sm/blur`), and
the converter must compose them into one `--bd-shadow-*` value. See [Decisions](#decisions-needed).

### Dos and don'ts

- **Do** separate resting surfaces with `border-default` and background steps (`bg-app`,
  `bg-raised`, `bg-sunken`), not shadows.
- **Do** use `shadow-overlay-sm` for anchored floating layers: menus, popovers, toasts,
  floating action bars.
- **Do** use `shadow-overlay-lg` for modal or docked layers that cover content: dialogs, the
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
- **Unused:** `font-family-mono` (Kbd uses the UI family), `font-size-4xl`,
  `duration-slow`.

### Proposed type ramp

These styles are derived from the combinations that actually occur. Each row replaces the
ad hoc combinations listed under it.

| Style             | Family  | Size   | Weight   | Line height | Tracking        | Replaces                                                                       |
| ----------------- | ------- | ------ | -------- | ----------- | --------------- | ------------------------------------------------------------------------------ |
| `Display/Page`    | display | 3xl 28 | semibold | tight       | tight           | PageHeader title, sign-in title                                                |
| `Display/Panel`   | display | 2xl 22 | semibold | tight       | tight           | TaskPanel title                                                                |
| `Display/Section` | display | xl 18  | semibold | tight       | tight           | Dialog title, assistant welcome, FilePanel name, doc `h2`                      |
| `Display/Card`    | display | lg 16  | semibold | tight       | tight           | Project and team card names, FocusCard and thread-history headings             |
| `Title/md`        | ui      | md 14  | semibold | snug        | normal          | Card title, notifications title, assistant title                               |
| `Title/sm`        | ui      | sm 13  | semibold | snug        | normal          | Section titles in panels, groups and dialogs; board column heading; bulk count |
| `Body/md`         | ui      | md 14  | regular  | normal      | normal          | `body`, dialog description, menu item                                          |
| `Body/sm`         | ui      | sm 13  | regular  | normal      | normal          | Secondary text (about 50 uses)                                                 |
| `Body/sm compact` | ui      | sm 13  | regular  | snug        | normal          | Notification excerpt, multi-line text in tight containers                      |
| `Label/md`        | ui      | md 14  | medium   | tight       | normal          | Button                                                                         |
| `Label/sm`        | ui      | sm 13  | medium   | snug        | normal          | Field label, segmented control, chips                                          |
| `Label/xs`        | ui      | xs 12  | medium   | tight       | normal          | Badge, table header                                                            |
| `Caption`         | ui      | xs 12  | regular  | snug        | normal          | Counts, metadata, tooltips (about 20 uses)                                     |
| `Overline`        | ui      | xs 12  | semibold | tight       | wide, uppercase | Sidebar, menu, command palette and notification group labels                   |
| `Mono/xs`         | mono    | xs 12  | medium   | tight       | normal          | Kbd, if it should be monospaced. Otherwise drop `font-family-mono`.            |

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

- **Do** choose a type style by role from the ramp, not by assembling primitives.
- **Do** choose the HTML element for document structure (`h1` to `h4`) and the type style
  for appearance. The two are independent.
- **Do** use Bricolage (display) only for page, panel, section and card headings, and for
  numerals meant as display. Everything interactive uses Instrument Sans.
- **Do** use tight line height only for single-line text (titles, labels, badges). Use snug
  or normal for anything that can wrap.
- **Do** use `Overline` (uppercase, wide tracking) only for group labels in navigation and
  menus.
- **Don't** reset heading defaults in components (`letter-spacing-normal` +
  `family-ui` on an `h3`). Apply the `Title/*` style instead.
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

Proposed: `stroke/default` 1, `stroke/strong` 2, `focus/ring-width` 2 and
`focus/ring-offset` 2, as Primitives variables. In Figma these bind to Stroke weight.

---

## Figma capture checklist

| Item                                                        | Status  | Action                                                                          |
| ----------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `space/*` variables, Gap scope                              | Done    | None                                                                            |
| `radius/*` variables, Corner radius scope                   | Done    | None                                                                            |
| `font/size`, `font/weight` variables                        | Done    | None                                                                            |
| `shadow/overlay` color                                      | Done    | None                                                                            |
| Size tokens for dot, indicator, skeleton line, `control-xs` | Missing | Add to Primitives; rebind Dot, Badge and Kbd                                    |
| Shadow geometry variables                                   | Missing | Add `shadow/overlay-sm/{y,blur}` and `shadow/overlay-lg/{y,blur}`               |
| Effect styles                                               | Missing | `Elevation/Overlay sm` and `Elevation/Overlay lg`, bound to the variables above |
| Text styles                                                 | Missing | 14 or 15 styles from the ramp, with size and weight bound                       |
| Components use text styles                                  | Missing | Apply styles to text in Badge, Button, Input, Avatar, Kbd and Tooltip           |
| Stroke-width variables                                      | Missing | Add, and bind on bordered components                                            |
| Usage guidance in Figma                                     | Missing | Put the dos and don'ts in style and variable descriptions                       |

Note: the library already contains Button, Input, Avatar, Kbd, IconButton and Tooltip.
`figma-library-plan.md` still lists only Spinner, Dot and Badge, and should be updated.

## Pipeline and validation follow-ups

These come after the Figma capture, in the validation phase.

1. **Converter:** compose `shadow/<level>/{x,y,blur,spread}` into `--bd-shadow-<level>`.
   Emit type styles in a form the code can use (see decision 2).
2. **Validator rules to add** (keep the existing ids stable):
   - `raw-shadow`: any `box-shadow` that is not a single `--bd-shadow-*` token, or `none`.
   - `raw-stroke-width`: a raw width in `border*`, `outline`, `outline-offset` or
     `text-underline-offset`.
   - `space-as-size`: a `--bd-space-*` token in `width`, `height`, `min-*` or `max-*`.
   - `raw-length-in-calc`: a raw px value inside `calc()` in any foundation property.
   - `off-ramp-typography`: a rule whose font declarations don't match a ramp style, once the
     ramp exists in code.
3. **Stylelint:** add `box-shadow` and the width properties to
   `declaration-strict-value`. Stop exempting `calc()` wholesale.
4. **Removal candidates:** `font-size-4xl`, `font-family-mono` (unless Kbd adopts it) and
   `duration-slow`. Remove them in Figma first, then regenerate.

## Decisions needed

1. **Elevation:** two levels (`overlay-sm` and `overlay-lg`)? And should Toast and
   BulkActionBar share one radius?
2. **Type in code:** Figma text styles don't round-trip through the variables export.
   Options:
   - **(a) Recommended.** Keep primitives as the only exported tokens. Write the ramp in a
     small, reviewed `type-styles` source. Generate CSS classes or composite tokens from it.
     The validator then checks code and Figma styles against that source.
   - (b) Add a `Type` variable collection per role (size, weight, line height and so on).
     This needs alias support in the converter.
3. **Ramp naming:** are the names and scope above right, including whether Kbd should become
   monospaced?
4. **Stroke widths:** include them in this round of Figma work?
