# Review Docs and Agents for drift against Code

Find places where `Docs/` and `Agents/` no longer describe what `Code/` actually does, and
fix the docs.

## Goal

Every claim in the agent material and the design-system docs matches the code as it is
today.

## Inputs

- `<scope>`: the whole repo, or a folder or topic to focus on (e.g. "token pipeline").

## Steps

1. Load `Agents/context/kit-structure.md` and `AGENTS.md` for orientation.
2. Read `Code/README.md` and `Code/ARCHITECTURE.md`. For every command, path, script name,
   and rule they state, confirm it exists in `Code/` and behaves as described.
3. Do the same for each file the `AGENTS.md` routing table points to that touches
   `<scope>`, plus the `.cursor/rules/*.mdc` globs (do they still match real paths?).
4. Check that every stub in `.claude/skills/`, `.cursor/skills/`, and `.cursor/rules/`
   points at a file that exists.
5. Fix the docs, not the code, unless the code is plainly wrong; if it is, report it
   instead of changing it in this task.
6. Commit per `Agents/context/git-workflow.md` (type `docs`). Stop before push.

## Done when

- Each drift found is either fixed or listed in your reply with why it was left.
- No routing-table row, rule glob, or stub points at a missing file.
