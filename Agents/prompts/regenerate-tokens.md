# Regenerate tokens from a new Figma export

Bring a fresh Figma variables export into the prototype and land it as a reviewable change.

## Goal

The generated token CSS matches the new Figma export, the build passes with the alpha
guard intact, and the deviations backlog is current.

## Inputs

- `<exports>`: the `.zip` files exported from the Figma library file.
- `<what changed>`: optional note from the designer on which sets or tokens changed.

## Steps

1. Create a `tokens/<slug>` branch per `Agents/context/git-workflow.md`.
2. Follow `Agents/skills/design-tokens/SKILL.md` from "Place the export" through
   "Run validation".
3. Summarize the token diff: tokens added, removed, renamed, and changed in value. Call out
   any token with `alpha < 1` that changed.
4. Fix components that referenced removed or renamed tokens; log anything you cannot fix
   in the backlog with a rationale.
5. Commit the token regeneration and any component fixes as separate commits. Stop before
   push.

## Done when

- `build` passes, including the alpha regression guard.
- `validate` has been run and the backlog is committed.
- Your reply lists the token changes and any new deviations.
