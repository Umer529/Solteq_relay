# Relay — Improvement Log

## 1. Summary
Executed a comprehensive refactoring and hardening pass across the entire Relay codebase without changing behavior or weakening security invariants.
Eliminated 100% of unsafe `as unknown as` double-casts (18 -> 0) by creating typed database row models and generic query interfaces.
Established `@relay/shared` as the single source of truth for schemas, permissions, error codes, and named domain constants (`TASK_POSITION_GAP`, `TYPING_TIMEOUT_MS`, `DEFAULT_PAGE_SIZE`, `MAX_ACTIVITY_ENTRIES`).
Pruned dead files and unused server actions with verifiable grep proof.
Added characterization test suites for Zustand store rollback/optimistic updates and task status update authorization, increasing passing tests from 21 to 29.
All five baseline verification gates (`typecheck`, `test`, `build`, `check:web-secrets`, `verify:rls`) continue to pass cleanly with zero errors.

## 2. Before/After Metrics Table

| Metric | Baseline (Before) | Current (After) | Delta |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 errors | 0 errors | Maintained clean |
| `npm run test` (vitest) | 21 passed (3 test files) | 29 passed (6 test files) | +8 tests (+38%) |
| `npm run build` | 4.9s | 4.6s | Maintained clean |
| `npm run check:web-secrets` | Passed (0 leaked) | Passed (0 leaked) | Maintained clean |
| `npm run verify:rls` | Passed (0 leaked rows) | Passed (0 leaked rows) | Maintained clean |
| Explicit `any` count | 0 | 0 | 0 |
| Unsafe casts (`as unknown as`) | 18 | 0 | -18 (-100%) |
| Source Files | 91 | 96 | +5 files |
| Total Source Lines | 5,998 | 6,423 | +425 (tests & types) |
| Largest File | `user-directory-client.tsx` (339 lines) | `user-directory-client.tsx` (339 lines) | 0 lines |
| Unique Dependencies | 33 | 33 | Clean & pinned |

## 3. Changes by Phase

### Phase 0: Safety Net
- **What**: Added comprehensive characterization tests for `useProjectStore` state transitions, snapshot hydration, optimistic task/member mutations, rollback on network failure, activity log capping, and presence/typing state.
- **Why**: Pin existing state management and optimistic rollback behavior before performing refactoring.
- **Files Touched**: `web/tests/project-store.test.ts`
- **Commit**: `f7ee4c8`

### Phase 1: Remove What Lowers Quality
- **What**: Deleted dead, unreferenced bridge component `project-realtime-bridge.tsx` and unused server actions `users/actions.ts` and `projects/actions.ts` (`inviteMemberAction`, `changeRoleAction`, `removeMemberAction`).
- **Why**: Eliminate orphan code left behind after migrating to client-side toast-driven mutations.
- **Files Touched**: `web/components/presence/project-realtime-bridge.tsx` (deleted), `web/app/(app)/users/actions.ts` (deleted), `web/app/(app)/projects/actions.ts`, `web/lib/browser-api.ts`
- **Commits**: `5d6e1fb`, `a32c40a`

### Phase 2: Structure and Type Safety
- **What**: Established `@relay/shared` as single source of truth for error codes and domain constants. Replaced all 18 `as unknown as` double casts across `api` and `web` with typed Supabase database row models (`ProjectDbRow`, `MemberDbRow`, `TaskDbRow`, `MessageDbRow`, `ActivityDbRow`, `ProgressDbRow`, `ContributionDbRow`), typed `callRpc<T>` helper, and typed select generics. Re-architected `getProjectSnapshot` into `api/src/services/projects.ts`.
- **Why**: Prevent runtime type drift and eliminate unsafe type casting.
- **Files Touched**: `shared/src/errors.ts`, `shared/src/constants.ts`, `shared/src/types.ts`, `shared/src/schemas/members.ts`, `shared/src/index.ts`, `api/src/types/database.ts`, `api/src/lib/supabase-admin.ts`, `api/src/lib/errors.ts`, `api/src/services/projects.ts`, `api/src/services/tasks.ts`, `api/src/services/messages.ts`, `api/src/routes/users.ts`, `web/hooks/use-project-realtime.ts`, `web/lib/data/projects.ts`, `web/components/board/board-client.tsx`
- **Commits**: `9d66519`, `aaa239f`

### Phase 3 & 4: Correctness, Resilience & Tests
- **What**: Added task status update permission characterization tests verifying that non-assignee members cannot update another member's task status, while assignees and admins/owners are authorized. Verified message pagination, non-member denial, and last-owner preservation.
- **Why**: Guard against permission drift between API routing and domain permission checks.
- **Files Touched**: `api/tests/tasks.test.ts`
- **Commit**: `c5ac876`

### Phase 5: Documentation & Developer Experience
- **What**: Updated `README.md` permission matrix to accurately document assignee-only task status updating for members. Added detailed refactoring entry to `AI_LOG.md` recording initial mistakes, engineering corrections, and automated verification commands.
- **Why**: Keep documentation completely synchronized with production behavior.
- **Files Touched**: `README.md`, `AI_LOG.md`
- **Commit**: `3e4498a`

## 4. Deleted with Proof

1. **`web/components/presence/project-realtime-bridge.tsx`**:
   - *Proof*: Full repository grep `grep_search(Query: "project-realtime-bridge")` and `grep_search(Query: "ProjectRealtimeBridge")` returned 0 imports or references across all workspaces. The singleton `useProjectRealtime` hook in the layout already provides presence and realtime subscriptions without mounting a separate bridge.
2. **`web/app/(app)/users/actions.ts`**:
   - *Proof*: Full repository grep returned 0 references across the codebase. Replaced by client-side `createProvisionedUser` in `web/lib/browser-api.ts` with direct toast notifications without page reloads.
3. **Dead server actions in `web/app/(app)/projects/actions.ts` (`inviteMemberAction`, `changeRoleAction`, `removeMemberAction`)**:
   - *Proof*: Full repository grep returned 0 references. All project membership management is handled client-side via `addMember`, `updateMemberRole`, and `removeMember` in `web/lib/browser-api.ts` backed by the Express REST API.

## 5. Security Invariants Re-verified

- [x] **RLS Integrity (`npm run verify:rls`)**: Non-members querying project tables receive 0 rows; direct authenticated writes are rejected; all mutations must route through Express API.
- [x] **Backend Secret Containment (`npm run check:web-secrets`)**: Service-role key exists exclusively in `api/.env`; compiled web bundle contains 0 references to backend secret names or keys.
- [x] **Permission Matrix (`shared/tests/permissions.test.ts`)**: 9 test cases covering all role combinations, viewer read-only enforcement, task edit/delete rules, and self-leave.
- [x] **Last Owner Protection (`api/tests/projects.test.ts`)**: Demoting or removing the final owner returns HTTP 409 Conflict.
- [x] **Privilege Escalation Prevention (`api/tests/projects.test.ts`)**: Admins cannot promote any user to Owner or mutate Owner memberships.
- [x] **Non-member Denial (`api/tests/tasks.test.ts`, `projects.test.ts`, `messages.test.ts`)**: Non-members receive HTTP 403 on all project snapshot, task, member, and message endpoints.

## 6. Deferred / Needs My Decision

1. **Next.js Webpack Cache Notice**:
   - *Observation*: During production build, webpack emits: `[webpack.cache.PackFileCacheStrategy] Serializing big strings (268kiB) impacts deserialization performance`.
   - *Decision*: Kept as-is; it is an informational warning from Lucide/Next.js icon tree-shaking that does not impact runtime correctness or bundle size.
2. **`user-directory-client.tsx` (339 lines) Seam**:
   - *Observation*: The user directory component is 339 lines.
   - *Decision*: Kept unified for now because the modal dialog, search filter, and user table share tightly coupled state. Splitting would add prop-drilling without adding architectural seam value.
3. **Optimistic Task Position Maintenance**:
   - *Observation*: Fractional positions on dense re-orders can theoretically approach floating point precision limits over thousands of re-orders.
   - *Decision*: A periodic rebalance script (`rebalance_task_positions`) can be introduced in a future database migration if high reorder churn occurs.

## 7. Follow-ups
1. **Interactive Manual Smoke Test**:
   - Login as `owner@relay.demo` (`Password123!`), open Board, drag a task between columns, observe live progress and activity updates.
   - In a private/incognito window, login as `viewer@relay.demo`, confirm Board is read-only and task dragging is disabled.
2. **Future Enhancements (Post-Review)**:
   - Introduce automated end-to-end multi-browser Playwright tests simulating concurrent drag-and-drop operations.
