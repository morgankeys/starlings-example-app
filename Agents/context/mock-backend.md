# Mock backend

Birdy has no server. `Code/src/mocks/` simulates one in the browser, behind a real HTTP
boundary, so the app code is written exactly as it would be against a real API. Load this
before touching seed data, handlers, permissions or Ask Birdy's answers.

## How it fits together

| Piece | File | Job |
| --- | --- | --- |
| Worker bootstrap | `src/mocks/browser.ts` | Starts MSW before the app renders (`main.tsx`) |
| Handlers | `src/mocks/handlers/*.ts` | One file per area: `org`, `tasks`, `files`, `search`, `assistant` |
| Route wrapper | `src/mocks/http.ts` | Simulated latency and failures, auth (401 when signed out), JSON errors, persisting after writes |
| Database | `src/mocks/db.ts` | In-memory object saved to `localStorage` (`birdy.db`); `resetDb()` reseeds |
| Record types | `src/mocks/db-types.ts` | What the DB stores (computed fields are added by serializers) |
| Permissions | `src/mocks/access.ts` | Who can see and edit what; serializers `toTask`, `toFile`, `toFolder` |
| Seed | `src/mocks/seed/` | Meridian Outdoor Co.: `people.ts`, `files.ts`, `tasks.ts`, `dates.ts`, `index.ts` |
| Assistant | `src/mocks/assistant/engine.ts` | Intent router that answers from the DB with citations |

## Rules

- **The app never imports from `mocks/`.** Only `main.tsx` and tests do. Shared shapes live
  in `src/domain/types.ts`.
- **Every handler goes through `route()`.** That gives it latency, failure simulation, auth
  and error handling for free. Throw `notFound()`, `forbidden()` or `badRequest()`; never
  return ad-hoc error bodies.
- **Check permissions in the handler,** with the helpers in `access.ts`. The UI also hides
  or disables controls, but the mock backend is the source of truth, so a persona switch
  shows real 403s and 404s.
- **Seed dates are relative.** Use `SeedClock` (`c.day(offset)`, `c.at(offset, hour)`).
  On load, `db.ts` moves every date forward by the days since seeding, so the demo always
  has overdue, today and this-week work.
- **Bump `DB_VERSION`** in `seed/index.ts` when the stored shape changes, so browsers with
  old data reseed instead of breaking.
- **Endpoints under `/api/v1/__demo/*`** belong to the Demo panel. They skip latency and
  failure simulation so the panel can always recover the app. `GET /session` and
  `GET /session/people` are exempt from failures for the same reason.

## Permissions model

- **Org roles:** `admin` (edit everywhere), `member`, `guest` (only what is shared with
  them by name; never org-wide access; can't create tasks or join teams).
- **Files and folders:** the strongest of ownership, a grant to the user, a grant to one of
  their teams, general access (`org_view` / `org_edit`, members only), and the same
  inherited from every ancestor folder.
- **The root folder ("All files")** is a container: members can open and add to it, but its
  access does **not** flow down, so top-level project folders can be private to their
  teams.
- **Tasks:** members see every task. Guests see tasks assigned to or created by them, and
  can update only their own.
- **Teams:** admins and team leads manage membership. A team always keeps at least one lead.

## Ask Birdy (the simulated assistant)

`answer(db, user, request)` in `assistant/engine.ts` picks an intent from the question and
the context (`file`, `task`, `team`, `project` or `person`), queries the DB as that user,
and returns text plus citations. Intents: summarize file, decisions and action items,
blocked (finds blockers by matching quoted task titles in descriptions), workload, focus /
prioritize, overdue, due, project status, who's working on, find files, explain task,
help. `focus()` powers the Home "Your focus today" card.

Answer text uses a small markup the UI renders: paragraphs, `- ` and `1. ` lists, `**bold**`,
and citation tokens such as `[[task:t_api_key]]`, `[[file:fl_spec]]`, `[[user:u_maya]]`.

**Swapping in a real model:** keep `POST /api/v1/assistant/messages` and its stream format
(`data: {"type":"token"|"citations"|"done"|"error", …}`), and replace `answer()` with a
call to a model given the same context. The UI doesn't change.

## Personas worth knowing

| Persona | Why sign in as them |
| --- | --- |
| Maya Okafor (Product Design lead) | Default. Overdue, today and this-week work; a lead who can manage her team |
| Dana Whitfield (Head of Operations) | Org admin: edit access everywhere |
| Raj Patel (Engineering Manager) | Leads a team that's blocked on a dependency |
| Julia Romero (Marketing Director) | Owns the catalog launch project |
| Hugo Lambert (Merchandising) | Member who **can't** see the Checkout Redesign folder |
| Elena Ruiz (Northlight Studio) | Guest: sees only the Photography folder and her own tasks |

Full profiles: `Docs/Personas/`.

## Testing

`src/mocks/access.test.ts` and `src/mocks/assistant/engine.test.ts` build a fresh seed with
`buildDatabase(new Date())` and assert against it. Add a test when you change a permission
rule or an intent.
