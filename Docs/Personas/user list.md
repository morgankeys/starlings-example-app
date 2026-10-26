# Users

People in Meridian's Birdy workspace. Profiles for the personas used most in testing are in
`Users/`; everyone else is defined in `Code/src/mocks/seed/people.ts`.

| Person | Role | Why they matter for testing |
| --- | --- | --- |
| [Maya Okafor](Users/Maya%20Okafor.md) | Product Design Lead | Default persona; a full, realistic day of work |
| [Dana Whitfield](Users/Dana%20Whitfield.md) | Head of Operations, **workspace admin** | Sees and edits everything |
| [Raj Patel](Users/Raj%20Patel.md) | Engineering Manager | Team lead with a blocked dependency |
| Julia Romero | Marketing Director | Owns the catalog launch |
| Hugo Lambert | Merchandising Planner | A member locked out of the Checkout folder |
| [Elena Ruiz](Users/Elena%20Ruiz.md) | Photographer, Northlight Studio (**guest**) | Sees only what's shared with her |
| Leo Brandt, Inés Carvalho, Sam Whitaker, Theo Nakamura | Product Design | |
| Chloé Martin, Ben Adeyemi, Kira Sato, Omar Haddad | Engineering | |
| Noah Fischer, Ava Lindqvist, Marcus Bell | Marketing | |
| Priya Raman | Supplier Manager | |

## Roles and status

Roles are `admin`, `member` and `guest`. Dana Whitfield is the only seeded admin, and she
can now manage the workspace from Settings: rename the company, invite people, change roles
and deactivate or reactivate people. Everyone is seeded `active`. People an admin invites
start as `invited` and become active the first time they sign in; deactivated people can't
sign in and drop out of pickers, but their tasks and files stay.
