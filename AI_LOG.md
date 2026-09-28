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

## 2026-09-28 — M4 activity, chat, and presence

- Added a live activity feed with human-readable entries, relative timestamps,
  user and event filters, and task deep links that open the board drawer.
- Added paginated project chat, optimistic sends with rollback, grouped author
  messages, Enter/Shift+Enter behavior, scroll-aware autoscroll, Viewer
  read-only behavior, and server-side message rate limiting.
- Added a transactional `post_message` function so each message and its
  activity entry commit together, plus shared Zod validation and REST tests.
- Added Presence-backed online indicators to the sidebar and members screen,
  and throttled Broadcast typing notices that expire after three seconds.
- Hardened Presence and Broadcast as private channels with policies on
  `realtime.messages` that check project membership. Postgres row changes
  continue to rely on the application tables' RLS policies.
- Extended the non-member RLS verifier to cover messages and activity. Verified
  strict typechecking, 19 automated tests, the production build, and the web
  bundle secret scan. The two-browser hosted Realtime check remains manual.

## 2026-09-28 — M5 interface polish

- Added a persistent manual light/dark theme control while retaining the system
  color preference as the default. Toast styling follows the active theme.
- Added skeleton route loading states and retryable error boundaries for the
  project area without introducing full-page spinners.
- Added pending feedback to authentication, project, membership, role, logout,
  and task forms, and prevented duplicate message submissions while sending.
- Fixed project navigation duplication by restricting the membership-backed
  project query to the signed-in user and deduplicating summaries by project ID.
- Separated Next.js development and production output directories after a
  concurrent production build invalidated the running development chunk cache.
- Improved keyboard and assistive-technology behavior with skip navigation,
  current-page markers, labeled dialogs, live connection status, consistent
  focus styles, and reduced-motion support.
- Reviewed the interface at the 768px target and kept narrow board content
  horizontally scrollable without collapsing the fixed workspace navigation.
- Rechecked the forbidden visual list: no gradients, glassmorphism, decorative
  blobs, colored glow, or oversized rounded cards; shadows remain limited to
  dialogs, the task drawer, and the actively dragged card.
- Verified strict typechecking, 19 automated tests, the production build, the
  compiled-web secret scan, and whitespace checks.

## 2026-09-28 — M6 documentation and handoff

- Reorganized the README from milestone notes into a clean-clone guide for the
  hosted, Docker-free Supabase workflow.
- Documented the architecture and trust boundaries, environment variables,
  complete migration order, demo accounts, commands, permission matrix,
  Realtime event behavior, security checks, and manual verification flow.
- Recorded the key engineering decisions and tradeoffs, including API-only
  writes, JWKS verification, transactional RPCs, snapshot recovery, fractional
  ordering, and private ephemeral channels.
- Added a timed two-minute demo script covering the board, live progress,
  activity, permissions, Presence, typing, chat, and security model.
- Added `FEATURES.md`, an exhaustive source-verified catalog of routes, visible
  controls, clicks, keyboard behavior, roles, live synchronization, API routes,
  validation, database guarantees, security, tooling, and test coverage.
- Added realistic next steps for end-to-end coverage, CI database checks,
  distributed rate limiting, pagination, position maintenance, observability,
  and accessibility testing.
- Completed final verification with strict typechecking, 19 automated tests,
  production builds, the compiled-web secret scan, and whitespace checks.
