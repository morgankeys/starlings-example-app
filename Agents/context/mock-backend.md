# Mock backend

Birdy has no server. `Code/src/mocks/` simulates one in the browser, behind a real HTTP
boundary, so the app code is written exactly as it would be against a real API. Load this
before touching seed data, handlers, permissions or Ask Birdy's answers.

## How it fits together

| Piece | File | Job |
| --- | --- | --- |
| Worker bootstrap | `src/mocks/browser.ts` | Starts MSW before the app renders (`main.tsx`) |
| Handlers | `src/mocks/handlers/*.ts` | One file per area: `org`, `tasks`, `bulk` (bulk task endpoints), `files`, `search`, `assistant`, `notifications` (notifications and the activity feed) |
| Route wrapper | `src/mocks/http.ts` | Simulated latency and failures, auth (401 when signed out), JSON errors, persisting after writes |
| Database | `src/mocks/db.ts` | In-memory object saved to `localStorage` (`birdy.db`); `resetDb()` reseeds |
| Record types | `src/mocks/db-types.ts` | What the DB stores (computed fields are added by serializers) |
| Workspace admin | `src/mocks/members.ts` | Org rename, invite, role/status changes and sign-in rules, as pure functions the handlers and tests share |
| Permissions | `src/mocks/access.ts` | Who can see and edit what; serializers `toTask`, `toFile`, `toFolder` |
| Seed | `src/mocks/seed/` | Meridian Outdoor Co.: `people.ts`, `files.ts`, `tasks.ts`, `dates.ts`, `index.ts` |
| Notifications | `src/mocks/notify.ts` | Who is notified of what (`notify*`), the visible list, mark-as-read |
| Activity feed | `src/mocks/activityFeed.ts` | `buildActivityFeed`: relevant, permitted recent events for `GET /activity` |
| Assistant | `src/mocks/assistant/engine.ts` | Intent router that answers from the DB with citations |
| Threads | `src/mocks/handlers/assistant.ts` | Stored Ask Birdy conversations (`assistantThreads`), see below |
| Suggested tasks | `src/mocks/assistant/suggest.ts` | Turns action items and "create a task…" requests into `SuggestedTask`s, and marks the ones already tracked |

## Rules

- **The app never imports from `mocks/`.** Only `main.tsx` and tests do. Shared shapes live
  in `src/domain/types.ts`. Logic both sides need lives in `src/lib/` (for example
  `quickAdd.ts`, which the assistant also uses to parse "create a task to …"); mocks may
  import `src/lib/` and `src/domain/`.
- **Every handler goes through `route()`.** That gives it latency, failure simulation, auth
  and error handling for free. Throw `notFound()`, `forbidden()` or `badRequest()`; never
  return ad-hoc error bodies.
- **Check permissions in the handler,** with the helpers in `access.ts`. The UI also hides
  or disables controls, but the mock backend is the source of truth, so a persona switch
  shows real 403s and 404s.
- **Seed dates are relative.** Use `SeedClock` (`c.day(offset)`, `c.at(offset, hour)`, and
  `c.ago(minutes)` for things that happened earlier today: it never lands in the future or
  before midnight, which a fixed hour like `c.at(0, 8)` can).
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
- **User status:** `active`, `invited` or `deactivated`. Invited people can sign in, which
  makes them active. Deactivated people get a 403 from `POST /session`, are left out of
  `GET /session/people`, search results and (in the UI, via `useActiveUsers`) the assignee,
  share and add-member pickers and quick-add `@mentions`. `GET /users` still returns them, so
  existing tasks, files and history keep showing their names; People and the profile page
  mark them "Deactivated". Their tasks stay assigned.
- **Workspace admin (admin only, else 403):** `PATCH /org` `{ name }`; `POST /users`
  `{ name, email, title, role, company? }` (email well formed and unique; members must use the
  org domain; guests can use any domain and need a company); `PATCH /users/:id`
  `{ role?, status?, title? }`. Safeguards, all 400: an admin can't change their own role or
  deactivate themselves; the workspace keeps at least one active admin; deactivating someone,
  or making them a guest, removes them from every team, but is blocked (naming the team) when
  they are its only lead.

## Notifications

`db.notifications` holds `NotificationRecord`s (`domain/types.ts`): `{ id, userId (recipient),
kind, actorId, taskId?, fileId?, folderId?, commentId?, excerpt?, createdAt, readAt }`.
`src/mocks/notify.ts` creates them; the task and share handlers call it after they change
something. Nothing else writes notifications.

| Kind | Raised when | Who hears |
| --- | --- | --- |
| `assigned` | A task is created with an assignee, or its assignee changes (`POST /tasks`, `PATCH /tasks/:id`) | The new assignee |
| `commented` | `POST /tasks/:id/comments` | The task's assignee and creator |
| `mentioned` | The same comment contains `@FirstName` | Each person named; wins over `commented` for the same comment |
| `status_changed` | `PATCH /tasks/:id` changes `status` | The task's creator |
| `shared` | `PUT /shares/:type/:id` adds grants | Newly reached people: named users, and every member of a newly granted team |

Rules for every kind: the **actor is never notified** of their own action; a person gets **at
most one notification per event** (a user grant plus a team grant, or assignee plus creator,
still make one); and nobody is notified about something they **can't see** (`canSeeTask`, so a
guest hears only about their own tasks). A share notifies only people the grants newly reach,
never the resource's owner. `excerpt` is the start of the comment for `commented` and
`mentioned`, and the new status for `status_changed`. Mentions are read with
`mentionedUsers` from `src/lib/mentions.ts` (first name, case-insensitive, accents folded with
`fold`; an `@` inside an email address does not count).

- `GET /api/v1/notifications?limit=` (default 20, max 50) returns `{ items, unreadCount }`,
  newest first. Items carry display fields (`title` = task title or file/folder name;
  `status` for `status_changed`; `excerpt` for comments). Items whose task, file or folder the
  user can no longer see are skipped, and `unreadCount` counts only visible ones.
- `POST /api/v1/notifications/read` takes `{ ids }` or `{ all: true }`, only touches the
  caller's own notifications, and returns `{ unreadCount }`. Anything else is a 400.
- **Seed** (`seed/notifications.ts`): Maya has six, three unread (Theo's comment on "Finalize
  address form error states", Elena mentioning her, Ava assigning "Approve hero shot list";
  read: Chloé's comment, Theo's status change on a task Maya created, Priya sharing the
  Supplier Portal folder). Ben, Chloé, Julia, Noah, Ava, Leo and Elena have a few too. The
  seed adds one comment (Elena's `@Maya` on "Deliver Ridgeline jacket selects") to carry the
  mention, and comments dated "today" use `c.ago(…)`.

## Activity feed

`GET /api/v1/activity?limit=` (default 15, max 50) returns `ActivityFeedItem[]`, newest first
(`activityFeed.ts`). An item is `{ id, kind, actorId, taskId?, fileId?, title, detail?,
createdAt }` where `kind` is a task `ActivityKind` (`created`, `status`, `assignee`,
`priority`, `due`, `title`, `file_linked`, `file_unlinked`), `comment`, or `file_edited`, and
`detail` is the new value, assignee name, file name, comment excerpt or folder (see the type's
doc comment). Sources: `db.activity`, `db.comments`, and file `updatedAt`/`updatedById`.

Relevant to a user means: tasks assigned to or created by them; tasks in a project owned by
one of their teams; and files they can see that someone else edited in the last 14 days. Their
own actions are left out. Permissions are applied first: deleted tasks and tasks they can't
see are dropped, files need `fileAccess`, and a folder name is only included when the folder is
openable. A guest therefore gets only their own tasks and the files shared with them, since
guests are in no team. Sharing does not count as editing a file (the share handler no longer
bumps a file's `updatedAt`), otherwise sharing would show up as "X edited …".

## Ask Birdy (the simulated assistant)

`answer(db, user, request)` in `assistant/engine.ts` picks an intent from the question and
the context (`file`, `task`, `team`, `project` or `person`), queries the DB as that user,
and returns text plus citations. Intents: summarize file, decisions and action items,
blocked (finds blockers by matching quoted task titles in descriptions), workload, focus /
prioritize, overdue, due, project status, who's working on, find files, explain task,
tasks from a file, create a task, help. `focus()` powers the Home "Your focus today" card.

Answer text uses a small markup the UI renders: paragraphs, `- ` and `1. ` lists, `**bold**`,
and citation tokens such as `[[task:t_api_key]]`, `[[file:fl_spec]]`, `[[user:u_maya]]`.

**Swapping in a real model:** keep `POST /api/v1/assistant/messages` and its stream format
(`data: {"type":"thread"|"token"|"citations"|"actions"|"done"|"error", …}`), and replace `answer()`
with a call to a model given the same context. The UI doesn't change.

### Threads (conversation history)

`db.assistantThreads` holds `{ id, userId, title, createdAt, updatedAt, messages, deletedAt }`;
a message is `{ id, role, text, citations, context, actions?, actionsResult? }`
(`StoredMessage` in `domain/types.ts`). Threads are private: every endpoint looks the thread
up by id **and** `userId`, so someone else's thread is a 404, not a 403.

- `POST /assistant/messages` takes an optional `threadId`. Without one it creates a thread
  titled from the first question (one line, 60 characters, `…` when cut). The stream starts
  with `{"type":"thread","id"}` and ends with `{"type":"done","messageIds":{user,assistant}}`.
  The user message and the finished answer are appended just before `done`, so a cancelled
  stream stores nothing. With demo latency set to `none` the stream is not paced.
- `GET /assistant/threads` (`{id,title,updatedAt,messageCount}`, newest first, hides empty
  and deleted threads), `GET|PATCH|DELETE /assistant/threads/:id`,
  `POST /assistant/threads/:id/restore`, and
  `PATCH /assistant/threads/:id/messages/:messageId` with `{ actionsResult }`.
- `DELETE` is a soft delete (`deletedAt`), so the Undo toast can call `restore`.
- Maya has three seeded threads. `buildAssistantThreads` in `seed/index.ts` writes them by
  calling `answer()` against the seeded DB. The text is baked at seed time, so relative
  phrases in it ("overdue by 1 day") do not move with the date shift.
- Tests: `handlers/assistant.test.ts` runs the handlers in `msw/node`.

### Suggested tasks

`answer()` returns `{ text, citations, actions }`. `actions` is a `SuggestedTask[]`
(`domain/types.ts`) and is empty for most answers. The handler streams one
`{"type":"actions","items":[…]}` event after `citations` and before `done`, only when
`actions` is non-empty. The assistant never creates anything: the chat shows a
`SuggestedTasks` card and the user confirms, which calls the normal `POST /tasks`.

A `SuggestedTask` is `{ key, title, description, assigneeId, dueDate, priority, projectId,
teamId, fileIds, existingTaskId }`. `key` is stable within one answer (`<fileId>:<n>` or
`request:0`). `existingTaskId` is set when the suggestion is already tracked.

Two sources, both in `assistant/suggest.ts`:

- **Action items in a file.** The summarize and decisions intents attach suggestions for the
  file's `- Action: <Name> to <verb phrase>.` bullets, and a dedicated intent ("turn the
  action items into tasks", "make tasks from this", "create tasks from the file/doc/notes")
  lists them. The first name is matched against users (accents folded with `fold` from
  `lib/quickAdd.ts`). Title = the verb phrase, capitalized, trailing period dropped. Project
  = the nearest ancestor folder with a `projectId`; team = that project's team, else the
  assignee's first team. `fileIds = [file.id]`, description `From “<file name>”.`, priority
  `medium`, no due date.
- **Explicit requests.** "create a task to …", "add a task: …", "remind me to …",
  "todo: …" (and "create a follow-up task" in a task's context). The lead-in is stripped and
  the rest goes through `parseQuickAdd`, so `tomorrow !high @ava` work. Assigned to the
  asker unless `@name` is given. In a task's context it inherits that task's project and
  team; in a file's context it links the file. These win over every other intent.

**Guests never get suggestions** (`role === 'guest'` returns `actions: []` and the text says
guests can't create tasks).

**Already-tracked matching.** A suggestion is tracked when a task the asker can see (not
deleted, done tasks included) is close enough in wording. Both titles are lowercased,
accent-folded, stripped of punctuation and stopwords, and lightly stemmed (trailing `s`).
They match when they share at least 2 words and their Dice score
(`2 × shared ÷ (words in A + words in B)`) is at least **0.6**. The best match wins, ties
going to a task that links the same file, then the same assignee. In the seed, true matches
score 0.67 or more and the closest false pair scores 0.36, so 0.6 sits in the gap.
Constants and the reasoning are in `suggest.ts` (`MATCH_THRESHOLD`, `MIN_SHARED_WORDS`);
re-check the seed's action items against the tasks if you change either.

The review notes and launch sync notes docs have only tracked action items; **Supplier pilot
kickoff notes** (`fl_pilot_kickoff`) has four untracked ones, which makes it the demo for
the create flow. Text ends with "I can turn N of these into tasks. Review them below." for
new suggestions, or says they are all already tracked.

## Bulk task endpoints

`handlers/bulk.ts` holds the logic as plain functions (`bulkUpdateTasks`, `bulkDeleteTasks`,
`bulkRestoreTasks`) so tests can call them with `buildDatabase()`:

- `POST /tasks/bulk` `{ updates: [{ id, patch }] }`, `POST /tasks/bulk-delete` `{ ids }`
  and `POST /tasks/bulk-restore` `{ ids }` all return `{ updated: Task[], skipped:
  [{ id, reason }] }`.
- Per-task permissions use `canSeeTask` / `canEditTask`. Tasks the user can't see are
  skipped as "Task not found", ones they can't edit as "You can only update tasks assigned
  to you", and guests can't delete. Skipping never fails the request; an invalid patch (bad
  status, unknown assignee, over 500 items) is a 400 and changes nothing.
- Updates reuse `applyPatch` from `handlers/tasks.ts`, so activity is logged per task
  exactly as for `PATCH /tasks/:id`. Delete and restore are soft (`deletedAt`) and, like the
  single endpoints, log nothing. Restore checks access as if the task were live.

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

`src/mocks/notify.test.ts` covers notification generation (and, through `msw/node` and the real
handlers, the endpoints); `src/mocks/activityFeed.test.ts` covers feed relevance and
permissions; the bell has a component test (`features/notifications/NotificationBell.test.tsx`)
that mocks `@/api/endpoints`.

`src/mocks/access.test.ts`, `src/mocks/members.test.ts` and `src/mocks/assistant/engine.test.ts` build a fresh seed with
`buildDatabase(new Date())` and assert against it. Add a test when you change a permission
rule or an intent. `src/mocks/handlers/bulk.test.ts` covers the bulk endpoints (permission
skips, activity). Suggested tasks also have a component test
(`src/features/assistant/SuggestedTasks.test.tsx`) that mocks `@/api/endpoints`, as does the
Members tab test (`src/features/org/MembersTab.test.tsx`).
