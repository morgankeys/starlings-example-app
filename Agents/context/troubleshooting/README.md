# Troubleshooting

Development tips, tricks, and gotchas learned the hard way. Each entry explains a problem
in terms of the platform (browser, CSS, Git, build tools), not any one framework, so it
holds whatever stack lives in `Code/`.

This folder is as-needed context: don't load it up front. When you hit a symptom, find it
below, then load only that entry.

## Index

| Symptom | Entry |
| --- | --- |
| A thin light or dark line along the edge of a rounded card, thumbnail, or overlay, where a scrim, gradient, or border sits over media | [`rounded-clipping.md`](rounded-clipping.md) |

## Adding an entry

Add one when a fix took real digging and the cause would bite again in another project.
A one-off typo or a fact the docs state plainly doesn't need an entry.

1. Create `<topic>.md` here, lowercase and hyphenated, named after the cause or the area
   (`rounded-clipping.md`), not the component that hit it.
2. Use these sections, dropping any that don't apply:
   - **The symptom** — what you see, and when it does or doesn't show up
   - **Why it happens** — the underlying cause
   - **Rules** — what to do so it doesn't happen
   - **Recipe** — a minimal, framework-agnostic example
   - **Trade-offs to know about**
   - **How to verify**
   - **Review checklist**
   - **Where this came from** — the fixes that taught us, so readers can find the commits
     (in the kit itself, describe the cases generically; name commits only in a project)
3. Keep it portable: plain HTML, CSS, JS, or shell in examples, and no framework syntax.
   Name project files only in "Where this came from".
4. Add a row to the index above, phrased as the symptom someone would notice.
5. If the entry applies to a whole kind of task, also add a row to the routing table in
   the repo-root `AGENTS.md`.
