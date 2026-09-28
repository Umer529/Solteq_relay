# AI collaboration log

## 2026-09-28 — M0 planning

- Reviewed the assessment specification and confirmed the repository had no
  existing application code.
- Proposed the npm-workspaces structure, dependency boundaries, muted forest
  design tokens, Geist typography, and JWKS-based access-token verification.
- No files were changed during M0, in line with the milestone rules.

## 2026-09-28 — M1 foundation

- Added the root workspace configuration, strict shared TypeScript settings,
  environment examples, and backend-secret build scanner.
- Added SQL migrations for enums, tables, indexes, profile/task triggers,
  progress views, RLS helper functions, SELECT-only authenticated policies,
  transactional RPCs, and Realtime publication settings.
- Added an idempotent seed for five demo users, one project, 15 tasks, 20
  messages, and 25 activity records. Added an automated non-member RLS check.
- Added an Express foundation with locked-down CORS, Helmet, JWKS access-token
  verification middleware, centralized JSON errors, and `/health`.
- Added Supabase SSR clients, persistent session middleware, registration,
  login, confirmation callback, logout, and a protected projects placeholder.
- Verified strict typechecking, API tests, production builds, and the compiled
  web secret scan. Database execution could not be run in this environment
  because neither Docker nor the Supabase CLI is installed; the repeatable
  verification command is documented in the README.
- Kept M2 project/member routes and permission logic out of M1 as required by
  the milestone boundary.

## 2026-09-28 — M2 projects, members, and roles

- Installed and pinned Supabase CLI 2.118.0 as a project dependency. Added a
  direct npm script because the repository path contains an ampersand, which
  can break Windows `.bin` command resolution.
- Added `supabase/setup.sql`, generated from all ordered migrations, for a
  Docker-free hosted Supabase SQL Editor workflow.
- Implemented the shared `can()` permission function and tests covering every
  role/action matrix entry, task creator/assignee rules, admin role limits,
  and last-owner invariants.
- Added project and membership validation schemas, membership-loading API
  middleware, permission-aware REST routes, and transactional RPCs for project
  updates/deletion plus member addition/removal/role changes.
- Added project creation, project sidebar switching, Cmd/Ctrl+K switcher,
  empty state, members list, invite form, role controls, removal, and self-leave.
  All controls use the shared permission function and explain disabled states.
- Verified strict typechecking, 12 automated tests, production builds, the
  compiled-web secret scan, and whitespace checks.

## 2026-09-28 — M3 tasks, board, and live progress

- Added shared task schemas and snapshot types plus transactional Postgres
  functions for creating, editing/assigning, and deleting tasks. Existing
  status changes remain atomic with their activity event.
- Added permission-checked task REST routes and the full project snapshot
  endpoint. Tests cover member creation, viewer denial, and non-member denial
  across every M3 route.
- Added a normalized Zustand project store with ID deduplication, optimistic
  create/edit/move/delete operations, and rollback with error toasts.
- Added the project Realtime hook for tasks, memberships, activity, and
  messages. It replaces state from the full snapshot after subscription or
  reconnection and redirects a user whose membership is deleted.
- Built the dense three-column requirements board with accessible DnD sensors,
  fractional positions, task create/edit drawer, assignee and priority fields,
  assignee filtering, viewer read-only behavior, and the `n` shortcut.
- Added live derived progress and per-member completion contributions. These
  recalculate immediately from the Realtime task list.
- Self-reviewed the board against the forbidden UI list: no gradients,
  glassmorphism, decorative shapes, colored glow, or oversized rounded cards;
  shadows are limited to the drawer and actively dragged card.
- Verified strict typechecking, 15 automated tests, production builds, and the
  compiled-web secret scan. The live hosted-database check remains manual
  because no local environment files or project credentials are present.
