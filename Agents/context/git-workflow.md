# Git workflow

How a track of work becomes commits and a pull request. Read this before creating a branch or committing.

Each track stays recognizable in its branch, its commits, and its pull request. Stay on the current branch when this chat belongs to that track. When the checkout has another conversation's changes, or this chat is a different track, ask before mixing them.

## Creating a branch

- This chat continues the branch already checked out: stay on it.
- `HEAD` is the integration branch (or the production branch, if they differ): create a feature branch from the integration branch before committing. Uncommitted work from this chat comes along with `git switch -c`.
- Another conversation's changes are in the checkout, or this chat is a different track: ask first. Separate with a new branch, separate commits, or by leaving the other work untouched.

Read-only chats do not need a branch. Never commit directly to the integration branch or the production branch.

### Base branch: the integration branch

Every track branches from an up-to-date **integration branch** and opens its pull request back into it. By default the integration branch is `main`. If the project adopts a separate integration branch (see [Optional: a staging branch](#optional-a-staging-branch)), record its name here and use it everywhere this doc says `<integration branch>`.

```bash
git fetch origin
git switch <integration branch> && git pull --ff-only
git switch -c feat/<slug>
```

Branch names are `<type>/<slug>`, lowercase and hyphenated.

| Type     | For                                                   |
| -------- | ----------------------------------------------------- |
| `feat`   | New pages, components, or capabilities                |
| `fix`    | Bug fixes and layout/style corrections                |
| `docs`   | `Docs/`, `Agents/`, and README changes                |
| `chore`  | Dependencies, config, tooling, housekeeping           |
| `tokens` | Token pipeline changes and Figma export regenerations |

### Optional: a staging branch

Some projects put an integration branch in front of production: all work merges into `staging`, and `staging` is promoted to `main` through its own pull request. If the project uses this model:

- The integration branch is `staging`. Feature work branches from it and merges into it.
- Only the `staging` → `main` promotion pull request targets `main`. Feature work never branches from or merges into `main` directly.
- Promotions use a merge commit, never squash or rebase. See [`Docs/github.md`](../../Docs/github.md).

## Commit style

One logical change per commit. A token regeneration and an unrelated component tweak are two commits.

Subject line: imperative mood, 72 characters max, no trailing period. Add a body only when the "why" is not obvious, as a few short bullets.

```
Add tone overlays to project cards

- Overlay color comes from the new tone token set
- Cards fall back to the neutral surface when no tone is set
```

Do not write session-summary subjects: one commit describes one change, not everything a chat did.

## After every commit: run all checks, then push

Every time you commit, run the full check set, then push the branch. Don't wait to be asked.

### 1. Run all checks

Run them from `Code/`, in this order. It is the same set as CI (`.github/workflows/ci.yml`), and [`Code/README.md`](../../Code/README.md) maps each role to its command.

1. `lint`
2. `check`
3. `build` (also runs the token, alpha, and dev-only guards)
4. `validate` (deviations are warnings; a new one needs a `Rationale:` line in the backlog)
5. `test`
6. `git diff --exit-code`: `build` and `validate` must not leave tracked files changed. If they do, commit the regenerated files.
7. `e2e`

If the machine's Chromium doesn't match the pinned Playwright, `e2e` fails to launch the browser. That is an environment problem, not a test failure. Set the path from the Gotchas in `Code/README.md` and rerun before reporting.

If a check fails, fix it in a new commit (don't amend) and run all the checks again. If you can't fix it, don't push. Tell the user which check failed and show its output.

### 2. Push

When every check passes, push the branch:

```bash
git push -u origin HEAD
```

- Never push to the integration branch or the production branch. Never force-push.
- If the push is rejected because the remote has commits you lack, fetch and merge them (don't rebase or force-push a shared branch), run the checks again, then push.
- Pushing updates the branch's open pull request, if it has one.

Opening a pull request still needs an ask: invoking `/pr` is that ask. Follow [`Agents/skills/pr/SKILL.md`](../skills/pr/SKILL.md). Without it, tell the user the branch name, the commits, and the check results.

## Two chats editing at once

Use a worktree when two chats must edit this repo at the same time. One checkout has one branch, so those chats would otherwise overwrite each other's files and the dev server.

```bash
git fetch origin
git worktree add ../<repo>-<slug> -b <type>/<slug> origin/<integration branch>
cd ../<repo>-<slug>/Code
# install dependencies, then run `dev` on the next free port
```

Dependency folders are not shared between worktrees; install them in each one. The main checkout owns `<dev port>`; the next worktree uses `<dev port> + 1`, then `+ 2`. `Code/README.md` says how to pass a port to `dev`.

After the branch is merged:

```bash
git worktree remove ../<repo>-<slug>
git branch -d <type>/<slug>
```

## Rules of thumb

- Rebase onto the integration branch. Do not merge the integration branch into a feature branch.
- Never commit generated output: build output and dependency folders belong in [`.gitignore`](../../.gitignore). If generated files show up in `git status`, fix the ignore rules.
  Exception: unpacked Figma token JSON under `Docs/Design system/Figma tokens/` is tracked on purpose, even though the `tokens` command regenerates it, so token diffs are reviewable in pull requests.
