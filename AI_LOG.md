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
