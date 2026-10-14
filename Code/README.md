# Code

Documentation entry point for the prototype code. Everything the prototype needs to run
lives in this folder; it can be wiped and rebuilt without touching `Docs/` or `Agents/`.

## Commands

The kit's docs, skills, CI, and PR template name commands by **role**, never by tool. Fill
in the right column with this project's real command (run from `Code/`), and keep it
current when the stack changes.

| Role       | What it must do                                                                                       | Command        |
| ---------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| `dev`      | Start the local dev server on `<dev port>`. The only place dev-only pages render. Say how to pass a different port. | `python3 -m http.server 8765 --directory .` (from `Code/`; change the port number to use another) |
| `build`    | Produce the production build. Runs `tokens` first, the alpha regression guard, and the dev-only pages guard. | `<fill in>` |
| `lint`     | Formatting check, code lint, and style lint (with token-only rules).                                  | `<fill in>` |
| `check`    | Type or template check, if the stack has one.                                                          | `<fill in>` |
| `tokens`   | Unpack the Figma token exports and regenerate the token CSS.                                           | `<fill in>` |
| `validate` | Run design-system validation and rewrite `Docs/Design system/deviations-backlog.md`. Exits 0 with deviations present; `validate --strict` exits 1 on any deviation (local only). | `<fill in>` |

## Quick Start

<!-- Fill in: install dependencies, run `tokens`, run `dev`, open http://localhost:<dev port>. -->

```bash
# 1. Install dependencies: <fill in>
# 2. Generate tokens:      <tokens>
# 3. Start the dev server: <dev>
```

## Gotchas

<!-- Stack quirks that cost someone time: environment variables, system binaries a script
     shells out to, framework behaviour that surprised you. One short entry each. -->

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the stack, project structure, styling rules,
validation, the dev-only pages guard, and the build workflow.
