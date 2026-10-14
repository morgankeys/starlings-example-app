# Dev-only pages

Sandbox, test, specimen, and sample pages exist for building the prototype, not for its
audience. They render on the local dev server (`dev`) and nowhere else: not in a local
production build, not on any shared or hosted environment.

Read this before adding any page that is not meant for the audience, or any page under a
`dev/` folder.

## Why this matters

- **Any non-local build is public.** Treat every build that leaves your machine as
  reachable by anyone. A noindex tag keeps a page out of search, not away from people.
- **Every hosted build is a production build.** Preview, staging, and production
  environments all run `build`, so the stack's dev-mode flag is off on all of them. "Dev"
  means the local dev server only.
- **A folder does not hide a page.** Most stacks build every file in the pages folder,
  whatever its name. A sample page with fictional content is one forgotten file away from
  shipping.

## The pattern

- **One folder.** Every dev-only page lives under a single `dev/` folder in the pages
  tree. Nowhere else.
- **Excluded from every production build.** The stack's mechanism (a route that emits no
  paths outside dev, a build-time exclusion, …) keeps everything under `dev/` out of
  `build` output.
- **A build guard fails the build if one leaks.** After building, a check looks for any
  output under `dev/` and exits non-zero if it finds one. It runs on every `build`, so CI
  and every hosted environment stop before a sandbox page can ship.
- **Sample content lives in components.** Fictional or placeholder material (invented
  companies, metrics, quotes, lorem ipsum) lives in a component that only a dev route
  renders, never in a page file of its own.
- **Real pages never import sample components.**

How the exclusion and the guard are implemented depends on the stack in `Code/`; document
both in `Code/ARCHITECTURE.md` under "Dev-only pages guard".

## Enforcement

When the guard fires, fix the page so it follows the pattern. Never remove, weaken, or
bypass the guard, and never move a sandbox page out of `dev/` to get past it.

The guard only watches `dev/`. A sandbox page placed anywhere else is still a mistake that
no check catches, which is why sandbox pages go in `dev/` only.

## Checking your work

Run from `Code/` (real commands in `Code/README.md`):

- `build` must pass, and the build output must contain no `dev/` folder.
- `dev`, then open `http://localhost:<dev port>/dev/<name>`: the page renders there.

## Sharing a sandbox page

Not supported. If a work-in-progress page needs review on a hosted environment, ask the
human first. It then becomes a real page with real content, and it should say it is a
draft.
