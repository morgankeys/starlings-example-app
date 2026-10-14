# Agents

Curated home for everything an AI agent needs to work in this kit. This folder is a
first-class peer of `Code/`, `Docs/`, and `Export/` — both humans and agents are expected
to read and maintain it.

The repo-root `AGENTS.md` is the entry point agents load first; it points here.

## Layout

```
Agents/
├── skills/        Reusable capabilities, one folder per skill (design-tokens/, pr/, example-skill/)
├── context/       Conventions and background (kit-structure, git-workflow, design-system, dev-only-pages)
│   └── troubleshooting/  Tips, tricks, and gotchas, indexed by symptom (load as needed)
├── prompts/       Task templates (review-drift, regenerate-tokens, example-task)
└── README.md      This index
```

## When to use each

- **skills/** — A repeatable, self-contained capability with clear trigger conditions
  (e.g. "package the prototype for export"). Each skill lives in its own folder with a
  `SKILL.md`. Current skills: `design-tokens` (regenerate tokens from a Figma export and
  validate design-system compliance) and `pr` (`/pr` commits, pushes, and opens a pull
  request). Copy `example-skill/` as a starting point for a new one, and add thin stubs in
  `.claude/skills/<skill>/` and `.cursor/skills/<skill>/` so those tools discover it.
- **context/** — Durable knowledge: coding conventions, folder structure decisions,
  architecture notes, gotchas. Load relevant files before making changes. Add to it when
  you learn something the next agent should know.
  - **context/troubleshooting/** — Gotchas indexed by symptom, written so they hold for
    any stack. Load only the entry that matches the symptom. Add an entry when a fix took
    real digging; see its `README.md`.
- **prompts/** — Ready-to-run task templates. Current prompts: `review-drift` (review
  `Docs/` and `Agents/` against `Code/`) and `regenerate-tokens` (bring in a new Figma
  export). Copy `example-task.md` for a new one. Keep them parameterized and short.

## Conventions

- Skill folder names: lowercase, hyphenated (`export-prototype`, not `Export Prototype`).
- One `SKILL.md` per skill folder; supporting files live alongside it.
- Keep this README's layout section up to date when you add a new subfolder.
