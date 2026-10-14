# Managing the repo

Notes for the people who own a project built on this kit: how branches flow, which repo
settings matter, and routine upkeep.

Related: [`Agents/context/git-workflow.md`](../Agents/context/git-workflow.md) holds the
rules agents follow for branches, commits, and pull requests. The same conventions suit
people too.

## Branch model

| Branch                 | Role                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `main`                 | Production                                                       |
| `<integration branch>` | Every change lands here first. Defaults to `main`; often `staging` |
| `<type>/<slug>`        | One track of work, e.g. `fix/contact-link`                       |
| `claude/<name>`        | Branches that Claude Code sessions name automatically            |

- **All work merges into the integration branch** through a pull request.
- If the integration branch is not `main`, **only the promotion PR targets `main`.** Never
  merge a feature branch straight into `main`: `main` and the integration branch diverge,
  and every later promotion has to reconcile them.

## Promoting to production

Only when the integration branch is separate from `main`.

1. Check the integration build looks right.
2. Open a pull request from the integration branch into `main`. CI runs on it.
3. Merge it with **Create a merge commit**. Never squash or rebase a promotion: that
   rewrites the integration branch's commits into new ones on `main`, the two branches stop
   sharing history, and the next promotion conflicts.

Promote often. Small promotions are easy to review and easy to roll back.

## What CI checks

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pull requests into the
integration branch: `lint`, `check`, `build`, `validate`, then `git diff --exit-code` to
fail the run if build or validation changed a tracked file. Validation prints deviations
as a warning and exits 0; a stale committed backlog is what fails the job. `--strict` is
local-only. Fill in the real commands from [`Code/README.md`](../Code/README.md).

## Recommended settings

GitHub doesn't expose most of these to agent sessions, which also cannot see rulesets, so
check them yourself in the repo's **Settings**.

| Setting                            | Where                         | Recommended                                                                    | Why                                                           |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Automatically delete head branches | General > Pull Requests       | On                                                                             | Branches disappear when their PR merges                       |
| Allow merge commits                | General > Pull Requests       | On                                                                             | Promotions must use merge commits                             |
| Protect `main`                     | Rules > Rulesets, or Branches | Require a pull request and the `verify` check; block force pushes and deletion | Production only changes through a reviewed, passing PR        |
| Protect the integration branch     | Rules > Rulesets, or Branches | Block force pushes and deletion; consider requiring the `verify` check         | Keeps the integration branch's history intact                 |

## Branch cleanup

A merged branch's work already lives in the integration branch, so deleting the branch
loses nothing. To list and delete every fully merged remote branch:

```bash
git fetch --prune origin
git branch -r --merged origin/<integration branch> | grep -vE 'origin/(main|<integration branch>|HEAD)' \
  | sed 's#origin/##' | xargs git push origin --delete
```

Branches the command skips are unmerged. Check them before deleting. With **Automatically
delete head branches** on, this is rarely needed.

## Working with agents

- **Agents open pull requests; people merge them.** An agent pushes a branch and opens a
  PR only when asked (the `/pr` skill). Merging and promoting are always done by a person.
- **Agent sessions can't delete branches.** Claude Code cloud sessions can push branches
  but get a 403 when deleting one, so branch cleanup is a person's job.
- **Agent rules live in the repo.** `AGENTS.md` is the entry point, and changes to how
  agents work go through pull requests like any other change.
