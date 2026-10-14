# Kit structure

Background on how this prototyping kit is organized. Load this before making changes that
span folders.

## Top-level folders

- `Code/` — the full codebase for the current prototype.
- `Docs/` — human-level documentation and resources.
- `Export/` — a drop zone for built versions of the prototype, staged for manual transfer
  to a server or environment. Treat as output: write here, don't hand-edit.
- `Agents/` — agent-facing instructions, skills, context, and prompts (this folder lives
  under `Agents/context/`).

## Design decisions

- **Agent content is kit-wide, not per-prototype.** It lives once at the root and applies
  to whatever is being built in `Code/`. It is intentionally *visible* (not a dotfolder)
  because both humans and agents curate it.
- **Tool-mandated files stay in their required locations.** The repo-root `AGENTS.md` is
  the front door; `.cursor/rules/` holds Cursor rule stubs that point back into `Agents/`
  rather than duplicating content. `.claude/skills/<skill>/SKILL.md` and
  `.cursor/skills/<skill>/SKILL.md` hold the same kind of stub for skills, because Claude
  Code and Cursor only discover skills there (e.g. `.claude/skills/pr/SKILL.md` points to
  `Agents/skills/pr/SKILL.md`). `CLAUDE.md`, `GEMINI.md`, and
  `.github/copilot-instructions.md` point to `AGENTS.md`.
- **Single source of truth.** When guidance could live in two places, put it in `Agents/`
  and reference it from the tool-mandated file.

## Kit provenance

A project forked from the kit records where it came from, so later kit improvements can be
compared and pulled in. Add one line to the fork's root `README.md`:

> Forked from prototyping-kit @ `<sha>` on `<date>`.

When you port a kit change into the fork, or a fork's improvement back into the kit,
update the line or note the port in the commit body.
