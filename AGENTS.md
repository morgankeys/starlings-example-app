# AGENTS.md

Front door for any AI agent working in this prototyping kit. Read this first, then load
what you need from `Agents/`.

## What this repo is

A prototyping kit. Work is organized into four top-level, peer folders:

| Folder     | Purpose                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `Code/`    | The entire codebase for the prototype being built.                        |
| `Docs/`    | Human-level documentation and resources.                                  |
| `Export/`  | Built versions of the prototype, staged for manual transfer to a server. |
| `Agents/`  | Instructions, skills, context, and prompts for AI agents (this material). |

You may read and manage **all four** folders, not just `Code/`.

## Where to look

- **Skills** — reusable capabilities: `Agents/skills/`
- **Context** — conventions, architecture, background to load before acting: `Agents/context/`
- **Prompts** — task templates and reusable prompts: `Agents/prompts/`
- **Index** — what's available and when to use it: `Agents/README.md`

## Context loading: on-demand vs always

Load deep context **on demand** to keep token costs down. If your task involves the left
column, read the right column first.

<!-- Add a row whenever the project gains a doc or skill an agent should load for a task. -->

| If your task involves... | Read this first |
| --- | --- |
| Creating a branch, committing, or separating tracks of work | `Agents/context/git-workflow.md` |
| `/pr` — commit, push, and open a pull request | `Agents/skills/pr/SKILL.md` |
| Repo settings, promoting to production, or branch cleanup | `Docs/github.md` |
| Any work in `Code/` (editing, adding, or debugging code) | `Code/ARCHITECTURE.md` |
| Quick commands, getting started, or which real command a role (`dev`, `build`, …) maps to | `Code/README.md` |
| Styling components, writing CSS, or implementing a page from Figma | `Agents/context/design-system.md` |
| Rounded cards or thumbnails with a scrim, gradient, or border over media | `Agents/context/troubleshooting/rounded-clipping.md` |
| A visual glitch, odd build or tooling behavior, or a bug that resists an obvious fix | `Agents/context/troubleshooting/README.md` |
| Regenerating tokens from a new Figma export, or the alpha transform | `Agents/skills/design-tokens/SKILL.md` |
| Bringing in a new Figma export end to end | `Agents/prompts/regenerate-tokens.md` |
| Design-system validation, the deviations backlog, or writing a `Rationale:` line | `Docs/Design system/design-in-code architecture.md` |
| Adding a sandbox, test, specimen, or sample page, or anything under a `dev/` pages folder | `Agents/context/dev-only-pages.md` |
| Choosing or adding a tool (token converter, linter, Figma capture) | `Docs/Tooling.md` |
| Forking the kit or porting changes between kit and fork | `Agents/context/kit-structure.md` |
| Reviewing `Docs/` and `Agents/` for drift against `Code/` | `Agents/prompts/review-drift.md` |
| What Birdy is, its workflows, or the scope of the prototype | `Docs/Plan.md` |
| The mock backend, seed data, or the simulated assistant (`Code/src/mocks/`) | `Agents/context/mock-backend.md` |
| Who the people and teams in the demo workspace are | `Docs/Personas/org list.md` and `Docs/Personas/user list.md` |

When a `.cursor/rules/*.mdc` file auto-attaches because you're editing a relevant file,
trust it — it has the just-in-time rules you need.

## Non-negotiable rules

These apply across all tasks. They are phrased as portable principles so they survive file
moves and kit reuse.

1. **Never hand-edit generated files.** If a file's header says `GENERATED` or `do not edit
   by hand`, regenerate it with the documented command instead. The one carve-out: where a
   generated file reserves fields for human and agent notes, those fields are meant to be
   edited and are read back on the next run (for example, the `Rationale:` lines in the
   design-system deviations backlog).
2. **Never weaken lint or validation rules to suppress design-system deviations.** Fix the
   root cause or log the deviation in the backlog — do not disable the rule or add an
   ignore comment. When you log one, write your best guess of why on its rationale line;
   leave the "needs review" sentinel only when the reason is genuinely unclear.
3. **Component styles are scoped and token-driven.** No inline styles, no hardcoded
   color, spacing, or radius.
4. **Keep tracks of work organized, and stop before the remote.** Each track stays
   recognizable in its branch, commits, and pull request. Never push or open a PR unless
   asked; `/pr` is that ask.
5. **Sandbox, specimen, and sample pages never ship.** They render only on the local dev
   server. Never weaken whatever build check enforces this.
6. **The token pipeline must preserve alpha.** Figma's variables export stores opacity in a
   separate `alpha` field; the `hex` field is RGB only. Whatever converts tokens to CSS must
   emit an alpha-bearing color for every token with `alpha < 1`, and the build must include
   a regression guard that fails when one loses its alpha. Never simplify, remove, or
   bypass that guard; fix the transform.

## Operating notes

- Keep `Code/`, `Docs/`, and `Export/` in sync when a change spans them (e.g. a new
  feature usually touches code, docs, and eventually an export).
- Treat `Export/` as an output drop zone: write built artifacts there, don't hand-edit them.
- When you learn a durable convention, record it in `Agents/context/` so the next agent
  inherits it.
