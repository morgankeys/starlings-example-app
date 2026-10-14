# Birdy

Birdy is a task-first workspace for company teams: tasks, files and folders, sharing, and an
AI assistant ("Ask Birdy"). It is made by Birdy, Inc., a hypothetical SaaS company.

This repo is a **test bed**. It stands in for a client's product codebase so Starlings can
work out how to prototype on top of a real app. The backend and the assistant are simulated
in the browser, and the demo workspace belongs to a fictional Birdy customer, **Meridian
Outdoor Co.**

> Scaffolded from prototyping-kit @ `f008cd2` (by way of `morgankeys/starlings-website`) on 2026-10-14.

## Prototyping kit

Agents start at [`AGENTS.md`](AGENTS.md). The kit's folders:

- `Code/` – the Birdy web app (Vite, React, TypeScript). Start with [`Code/README.md`](Code/README.md).
- `Docs/` – the plan ([`Docs/Plan.md`](Docs/Plan.md)), design system, and personas.
- `Export/` – built output staged for hosting.
- `Agents/` – agent skills, context, and prompts.

Kit details: [`Agents/context/kit-structure.md`](Agents/context/kit-structure.md).

## Running

```bash
cd Code
npm install
npm run dev        # http://localhost:5173
```

Sign in as anyone at Meridian. The **Demo** button (bottom left) switches people, simulates
slow or failing requests, and resets the data.
