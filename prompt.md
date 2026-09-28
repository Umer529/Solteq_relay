# ASSIGNMENT: "Relay", a Slack-inspired project collaboration app

## 0. Read this first
You are a senior full-stack engineer pair-programming with me. This is a
one-day technical assessment given by a recruiter. The recruiter is evaluating:
1. Whether the app works, with multi-user roles and everything updating LIVE.
2. UI quality. It must NOT look like typical AI-generated output.
3. How well I use AI. I must be able to explain every decision, so keep code
   readable, small, and explainable. Do not over-engineer.
4. Security and correctness (permissions, RLS, no leaked secrets).

Rules of engagement:
- Work milestone by milestone (section 13). Stop after each and wait for me.
- Before writing code, ask up to 3 clarifying questions if truly needed, then
  propose the folder structure and wait for approval.
- Prefer boring, well-known solutions. Fewer features done properly beats many
  done badly.
- If you deviate from this spec, say so and explain why in one paragraph.
- After each milestone, give me: what was built, how to run/test it, what to
  demo, and any known gaps. Append a dated entry to `AI_LOG.md`.

## 1. Product summary
Teams work inside **Projects**. Each project has members with **roles**, a
**requirements/task board** with **live progress**, an **activity log** of who
did what, and a **chat channel**. Every change appears instantly for all
connected users, with no refresh.

The user has never used Slack. The Slack-like parts are only: a left sidebar
listing projects, a per-project real-time chat, member presence dots, and a
dense, keyboard-friendly interface.

## 2. Tech stack (fixed)
| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS, Zustand, @dnd-kit, lucide-react, sonner (toasts) |
| Backend | Node.js + Express + TypeScript, separate service (REST) |
| Database | Supabase Postgres, schema managed by SQL migrations in `/supabase/migrations` (Supabase CLI) |
| Auth | Supabase Auth (email+password). Frontend uses `@supabase/ssr`. Backend verifies the Supabase JWT |
| Realtime | Supabase Realtime: `postgres_changes` for data, Presence for online users, Broadcast for typing. NO Socket.io |
| Validation | zod, with schemas shared in `/shared` |
| Tests | vitest (permission helper + API tests) |
| Repo | npm workspaces monorepo: `/web`, `/api`, `/shared`, `/supabase` |

Environment variables (commit `.env.example` files only; `.env*` in `.gitignore`
BEFORE the first commit):
```
# web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000

# api/.env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # BACKEND ONLY. Must never appear in the web bundle
SUPABASE_JWT_SECRET=            # or use JWKS verification; explain which you chose
PORT=4000
WEB_ORIGIN=http://localhost:3000
```
`npm run dev` at the root starts web + api together (use `concurrently`).
`npm run seed` populates demo data. `npm test` runs all tests.

## 3. Architecture and trust boundaries (important, follow strictly)
```
Browser (Next.js)
  |-- READS + LIVE UPDATES --> Supabase (anon key + user JWT), protected by RLS
  |-- WRITES ----------------> Express API (user JWT in Authorization header)
                                  |-- verify JWT
                                  |-- can(role, action, ctx) permission check
                                  |-- Postgres transaction (data change + activity_log row)
                                  '-- uses service-role key
Supabase Realtime pushes committed row changes to all subscribed clients.
```
Rules:
1. **All mutations go through the Express API.** The browser never writes to
   tables directly. There are no INSERT/UPDATE/DELETE RLS policies for
   `authenticated` on the app tables, so direct writes fail by design.
2. **Reads may go directly to Supabase**, but RLS restricts every row to
   members of that project. `postgres_changes` respects RLS on INSERT/UPDATE,
   which is why RLS policies are mandatory.
3. **Every mutation that changes project state writes an `activity_log` row in
   the SAME transaction** (use a Postgres RPC function or a `pg` transaction).
   Never log outside the transaction.
4. The API derives the caller from the verified JWT (`sub`), never from the
   request body. It loads the caller's membership role from the DB on each
   request; it does not trust role claims from the client.
5. The service-role key exists only in `/api`. Add a CI-style check (a simple
   script) that greps `/web` build output for it.
6. Client state: dedupe by id, apply optimistic updates with rollback on API
   error, and refetch the full project snapshot when Realtime reconnects.

## 4. Roles and permission matrix
Roles per project (enum `project_role`): `owner`, `admin`, `member`, `viewer`.

| Action key | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| `project.delete` | yes | no | no | no |
| `project.update` | yes | yes | no | no |
| `member.invite` | yes | yes | no | no |
| `member.remove` | yes | yes (not Owner/Admin) | no | no |
| `member.changeRole` | yes | yes (only among member/viewer; cannot touch Owner/Admin, cannot grant Owner/Admin) | no | no |
| `task.create` | yes | yes | yes | no |
| `task.edit` (title, description, priority, assignee) | yes | yes | only if creator or assignee | no |
| `task.delete` | yes | yes | only if creator | no |
| `task.changeStatus` | yes | yes | yes | no |
| `message.post` | yes | yes | yes | no |
| `project.view` (everything read-only) | yes | yes | yes | yes |

Invariants:
- A project always has at least one Owner. Block demoting or removing the last
  Owner (return 409 with a clear message).
- Users can leave a project themselves unless they are the last Owner.
- Implement ONE pure function in `/shared/permissions.ts`:
  `can(role, action, ctx?: { actorId, targetUserId?, targetRole?, task? }): boolean`
  and use it in every API route AND in the UI to show/hide/disable controls.
  Disabled controls get a tooltip explaining why ("Only admins can change roles").
- Write unit tests covering every row of this matrix plus the invariants.

## 5. Database (Supabase Postgres). Implement as migrations
Create `/supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_realtime.sql`
(or similar). Below is the required design. Refine syntax if needed, but keep the
semantics.

### 5.1 Enums and tables
```sql
create extension if not exists pgcrypto;

create type public.project_role  as enum ('owner','admin','member','viewer');
create type public.task_status   as enum ('todo','in_progress','done');
create type public.task_priority as enum ('low','medium','high','urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_color text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  position double precision not null default 0,   -- fractional ordering inside a column
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_project_status_idx on public.tasks(project_id, status, position);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_project_created_idx on public.messages(project_id, created_at desc);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,   -- e.g. task.created, task.status_changed, task.assigned,
                        --      member.joined, member.removed, member.role_changed,
                        --      project.updated
  payload jsonb not null default '{}'::jsonb,   -- store display names/titles too,
                                                -- so history survives deletions
  created_at timestamptz not null default now()
);
create index activity_project_created_idx on public.activity_log(project_id, created_at desc);
```

### 5.2 Triggers
- `handle_new_user()`: `security definer`, `set search_path = public`, on
  `auth.users` insert, creates the `profiles` row (`display_name` from
  `raw_user_meta_data->>'display_name'`, falling back to the email prefix; pick
  `avatar_color` from a small palette).
- `set_updated_at()` trigger on `tasks`.
- `on_task_status_change()` before-update trigger on `tasks`: when status
  becomes `done`, set `completed_at = now()` (`completed_by` is set by the API
  from the caller); when it moves away from `done`, null both.

### 5.3 Helper functions (`security definer`, `stable`, `set search_path = public`)
```sql
create function public.is_project_member(p_project_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships
                 where project_id = p_project_id and user_id = auth.uid());
$$;

create function public.shares_project_with(p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = p_user_id);
$$;
```
(`security definer` avoids infinite recursion when RLS policies on
`memberships` call back into `memberships`.)

### 5.4 Row Level Security (enable on ALL app tables)
```sql
alter table public.profiles     enable row level security;
alter table public.projects     enable row level security;
alter table public.memberships  enable row level security;
alter table public.tasks        enable row level security;
alter table public.messages     enable row level security;
alter table public.activity_log enable row level security;

-- SELECT only. No insert/update/delete policies for anon/authenticated.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));
create policy projects_select on public.projects for select to authenticated
  using (public.is_project_member(id));
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_project_member(project_id));
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_project_member(project_id));
create policy messages_select on public.messages for select to authenticated
  using (public.is_project_member(project_id));
create policy activity_select on public.activity_log for select to authenticated
  using (public.is_project_member(project_id));
```
The API uses the service-role key, which bypasses RLS. That is why the API MUST
enforce `can()` itself.

### 5.5 Progress view (derived, never stored)
```sql
create view public.project_progress with (security_invoker = true) as
select p.id as project_id,
       count(t.*)                                  as total,
       count(t.*) filter (where t.status = 'done') as done
from public.projects p left join public.tasks t on t.project_id = p.id
group by p.id;

create view public.member_contributions with (security_invoker = true) as
select t.project_id, t.completed_by as user_id, count(*) as completed
from public.tasks t
where t.status = 'done' and t.completed_by is not null
group by t.project_id, t.completed_by;
```
(The UI can also compute these from the live task list in the store, which is
instant and needs no extra round trip. Use the views for the initial snapshot
and as a source of truth.)

### 5.6 Realtime publication
```sql
alter publication supabase_realtime add table
  public.tasks, public.memberships, public.messages, public.activity_log;
alter table public.tasks       replica identity full;
alter table public.memberships replica identity full;
```
Note for the client: `postgres_changes` DELETE events are not filtered by RLS
and carry only old-record fields, so subscribe with a `project_id=eq.<id>`
filter and treat a delete payload as "remove by id".

### 5.7 Transactional writes
Implement multi-step mutations as Postgres functions called by the API via
`supabase.rpc(...)`, or use a direct `pg` connection with explicit
transactions. Required atomic operations:
- `create_project(name, description)`: insert project, insert Owner membership,
  log `project.created`.
- `change_task_status(task_id, status, actor)`: update task (+
  `completed_by`), log `task.status_changed` with `{title, from, to}`.
- `change_member_role(project_id, user_id, role, actor)`: enforce last-owner
  invariant, update, log `member.role_changed` with names and old/new roles.
Each function is `security invoker` and is called only by the API with the
service role. Revoke `execute` from `anon` and `authenticated`.

### 5.8 Seed script (`/api/scripts/seed.ts`)
Use `supabase.auth.admin.createUser` (email_confirm: true) for 5 users:
owner, admin, two members, one viewer (password `Password123!`, print the
credentials in the console). Create 1 project ("Website Redesign"), memberships
with those roles, 15 tasks across all three statuses with varied assignees and
completers, ~25 activity_log entries, and ~20 chat messages with staggered
timestamps. The seed must be idempotent (safe to run twice).

## 6. REST API contract (Express)
All routes: `Authorization: Bearer <supabase access token>`. Every body/param is
validated with zod from `/shared`. Errors: `{ "error": { "code": "FORBIDDEN",
"message": "..." } }` with correct HTTP codes (400/401/403/404/409). One central
error handler. A `requireMember(projectId)` middleware loads the caller's role
and attaches it to `req`.

| Method + path | Action key | Notes |
|---|---|---|
| `POST /projects` | none (any authed user) | creator becomes Owner |
| `PATCH /projects/:id` | project.update | |
| `DELETE /projects/:id` | project.delete | |
| `POST /projects/:id/members` | member.invite | body `{ email, role }`; look up profile by email server-side; 404 if user does not exist; 409 if already a member |
| `PATCH /projects/:id/members/:userId` | member.changeRole | body `{ role }` |
| `DELETE /projects/:id/members/:userId` | member.remove (or self-leave) | last-owner guard |
| `POST /projects/:id/tasks` | task.create | |
| `PATCH /projects/:id/tasks/:taskId` | task.edit | fields: title, description, priority, assignee |
| `PATCH /projects/:id/tasks/:taskId/status` | task.changeStatus | body `{ status, position }` (drag/drop) |
| `DELETE /projects/:id/tasks/:taskId` | task.delete | |
| `POST /projects/:id/messages` | message.post | |
| `GET /projects/:id/snapshot` | project.view | project + members + tasks + progress + last 50 activity + last 50 messages, used for first load and on reconnect |
| `GET /projects/:id/messages?before=<iso>&limit=50` | project.view | pagination |
| `GET /health` | none | |

Also add basic rate limiting on message posting and `helmet`, plus CORS
restricted to `WEB_ORIGIN`.

## 7. Realtime design (client)
Per open project, create Supabase channels:
1. `project:<id>:db`, using `postgres_changes` with filter `project_id=eq.<id>` on
   `tasks`, `messages`, `activity_log`, `memberships`. Map each event to a
   Zustand store action (upsert/remove by id, deduped).
2. `project:<id>:presence`, using Presence to track `{ userId, name, color,
   lastSeen }` (online dots in the sidebar and members tab) and Broadcast
   event `typing` (`{ userId, name }`, throttled, auto-clears after 3s).
   Hardening (do if time permits): make this a private channel with an RLS
   policy on `realtime.messages` so only project members can join.
On `SUBSCRIBED` after a reconnect, refetch `/snapshot` and replace store state.
If the caller's membership row is deleted while they are viewing the project,
show a "You were removed from this project" state and redirect. Provide a small
`useProjectRealtime(projectId)` hook so this logic lives in one place.

Event reference table (put this in the README):
| Source | Event | Client reaction |
|---|---|---|
| tasks INSERT/UPDATE/DELETE | task changed | update board + progress + contributions |
| memberships INSERT/UPDATE/DELETE | membership changed | update member list, roles, permissions in UI |
| messages INSERT | new message | append (dedupe by id) |
| activity_log INSERT | new activity | prepend to feed |
| presence sync/join/leave | online users | update dots |
| broadcast typing | typing | show "X is typing..." |

## 8. Features (priority order; do not skip ahead)
1. **Auth**: register (with display name), login, logout, persistent session,
   Next.js middleware protecting app routes, redirect logic.
2. **Projects**: create, list mine, switch in the left sidebar, Cmd/Ctrl+K
   switcher, empty state for a user with no projects.
3. **Members and roles**: list with role badges and online dots, invite by
   email, change role via dropdown (permission-aware), remove member, leave.
4. **Requirements/Tasks**: create/edit/delete task drawer, kanban with three
   columns and drag-and-drop (@dnd-kit) using optimistic updates, plus
   assignee picker, priority badge, and filter by assignee.
5. **Live progress**: top bar shows "X of Y requirements done", a thin progress
   bar, and a per-member "completed" breakdown (avatar + count), updated live.
6. **Activity log**: live feed with relative timestamps and human sentences
   ("Sara moved 'Login page' to Done"), filter by user and event type, and
   each entry links to the task when it still exists.
7. **Chat**: history with pagination, send with Enter (Shift+Enter for a
   newline), autoscroll unless the user scrolled up, typing indicator, and
   grouped consecutive messages from the same author. Viewers see it
   read-only.
If time is short, cut in this order: typing indicator, private presence
channel, task filters, activity filters. NEVER cut roles, live progress, or
the activity log.

## 9. UI/UX requirements (graded heavily)
Direction: a calm, dense, professional work tool. Reference feel: Linear,
Slack, Notion. It must not look AI-generated.

FORBIDDEN: purple/blue/pink gradients, gradient buttons or text, glassmorphism,
glowing/colored shadows, emoji as icons, oversized rounded cards (max radius 8px),
big hero sections, decorative blobs, centered marketing-style layouts inside
the app, and generic "Welcome back" filler.

REQUIRED:
- Palette: neutral gray scale plus ONE restrained accent (choose a single
  muted color, e.g. a deep green or ink blue), defined as CSS variables
  (`--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, plus
  semantic status colors used sparingly). Light and dark mode via
  `prefers-color-scheme` plus a manual toggle.
- Typography: Inter or Geist via `next/font`. Base 13-14px, tight but readable,
  clear weight hierarchy, tabular numbers for counts.
- Layout: fixed left sidebar (workspace name, projects list, online members),
  slim top bar (project name, progress, user menu), main area with tabs
  `Chat | Board | Activity | Members`. Max information density; small paddings;
  1px borders; shadows only on popovers/menus.
- Icons: lucide-react only, 16px, 1.5 stroke.
- Interaction polish: skeleton loaders (no spinners on full pages), meaningful
  empty states with one clear action, toasts for errors, optimistic drag/drop
  with rollback, visible focus rings, keyboard shortcuts (Cmd/Ctrl+K, Enter to
  send, `n` to create a task, Esc to close drawers), tooltips on disabled
  controls, and layouts that hold up down to 768px width.
- Role-aware UI: controls the user cannot use are hidden or disabled
  (with a reason), driven by the shared `can()` function.
- Accessibility basics: semantic HTML, labels, aria-live for new chat messages
  and toasts, contrast AA.
After building each screen, self-critique it against the FORBIDDEN list and fix
issues before presenting.

## 10. Non-goals (do NOT build)
Threads, file uploads, DMs, email notifications, OAuth providers, mobile app,
multiple channels per project, billing, admin dashboards.

## 11. Engineering standards
- TypeScript strict, no `any`, no unused code, small files, clear names.
- Shared zod schemas and types in `/shared` (used by both api and web).
- Folder sketch (propose adjustments before coding):
```
  /shared    permissions.ts, schemas/*.ts, types.ts
  /api       src/{routes,middleware,services,lib}, scripts/seed.ts, tests/
  /web       app/(auth)/..., app/(app)/projects/[id]/{chat,board,activity,members}
             components/, lib/{supabase,api,realtime}, store/
  /supabase  migrations/, config.toml
```
- Commit early and often with clear messages (one commit per logical step).
- Security checklist to verify before finishing: service-role key absent from
  the web bundle; RLS enabled on every table; a non-member user receives ZERO
  rows and ZERO realtime events for a project; every API route calls `can()`;
  inputs validated; CORS locked down.

## 12. Testing and verification
- `shared`: unit tests for `can()` (full matrix, last-owner invariant helpers).
- `api`: integration tests for at least: create task (member ok, viewer 403),
  change role (admin cannot promote to owner), remove last owner (409),
  non-member gets 403 on every project route.
- Manual RLS test script/doc: sign in as a user who is NOT in the project and
  show that selecting tasks returns nothing.
- Manual live test: two browsers (Owner and Viewer). Drag a task in one; the
  other updates the board, progress bar, contribution counts, and the activity
  feed within about a second.

## 13. Milestones (stop after each and wait for my go-ahead)
**M0 Plan.** Ask clarifying questions (max 3), then propose the folder
structure, dependency list, and the design tokens (palette, accent color,
font). No code yet.
**M1 Foundation.** Monorepo scaffold, Supabase migrations (tables, enums,
triggers, helper functions, RLS, publication), auth pages, Next middleware,
Express skeleton with JWT verification + error handler + `/health`, seed script.
*Acceptance:* I can register/login, and the seed creates the demo project;
RLS blocks a non-member.
**M2 Projects, members, roles.** `can()` + tests, project/member endpoints
and RPCs, sidebar, members tab with role dropdown and invite.
*Acceptance:* the permission matrix is enforced by the API (verified by tests)
and mirrored in the UI.
**M3 Tasks, board, live progress.** Task endpoints, kanban DnD with optimistic
updates, Realtime hook, progress header with contributions.
*Acceptance:* two browsers stay in sync for create/move/edit/delete.
**M4 Activity and chat.** Activity feed with filters, chat with pagination,
presence and typing.
*Acceptance:* all events stream live; a non-member sees nothing.
**M5 Polish.** Dark mode, skeletons, empty and error states, shortcuts,
responsive pass, accessibility pass, self-critique against section 9.
**M6 Docs and handoff.** README (setup incl. creating the Supabase project,
running migrations, env vars, seed credentials; mermaid architecture diagram;
Realtime event table; permission matrix; "Decisions and tradeoffs"; "What I'd do
with more time"), `AI_LOG.md` cleanup, and a 2-minute demo script.

## 14. Definition of done
Everything in sections 8 (items 1-6 minimum), 11, and 12 works from a clean
clone: `npm install`, fill `.env` files, run migrations, `npm run seed`,
`npm run dev`. No secrets in git. No console errors. The UI passes the
FORBIDDEN-list check.

Start with M0 now.