# Relay complete feature catalog

This document inventories the functionality currently implemented in Relay. It
covers visible screens and controls, keyboard behavior, role restrictions,
Realtime behavior, API endpoints, validation, database guarantees, security,
developer tooling, and automated verification.

## 1. Application routes

| Route | Implemented behavior |
| --- | --- |
| `/` | Checks the Supabase user and redirects authenticated users to `/projects` and guests to `/login`. |
| `/login` | Email/password sign-in form with validation, status messages, and a registration link. |
| `/register` | Display-name, email, and password registration form with validation and a sign-in link. |
| `/auth/callback` | Exchanges a valid Supabase email code for a session and safely redirects only to local paths. Invalid/expired links return to login with an error. |
| `/projects` | Authenticated project list/sidebar plus the create-project form. |
| `/projects/:id` | Redirects to the selected project's Board. |
| `/projects/:id/board` | Requirements board, progress, contributions, filtering, task drawer, and live connection state. |
| `/projects/:id/chat` | Project chat, history pagination, typing, and live messages. |
| `/projects/:id/activity` | Live, filterable audit/activity feed. |
| `/projects/:id/members` | Member list, online state, invitations, role management, removal, and leaving. |
| `/health` on the API | Returns the Express service health response. |

All application routes except login, registration, and the auth callback are
protected by Supabase session middleware.

## 2. Authentication and session features

### Registration

- The **Display name** field is required, trimmed, and limited to 2–60
  characters.
- The **Email** field uses email validation, trims whitespace, and allows at
  most 254 characters.
- The **Password** field requires 8–128 characters.
- Clicking **Create account** changes the button text to **Creating account…**
  and disables repeat submission while pending.
- The display name is stored in Supabase user metadata and copied into the
  automatically created profile.
- If Supabase returns a session immediately, registration redirects to the
  project page.
- If email confirmation is required, registration redirects to login with a
  “Check your email” message.
- Supabase errors are displayed in an alert-style message.
- Clicking **Sign in** moves to the login page.

### Login

- The **Email** and **Password** fields use the same shared validation rules.
- Clicking **Sign in** changes the button text to **Signing in…** while the
  server action is pending.
- Invalid form values display a generic valid-email/password message.
- Invalid credentials display “Email or password is incorrect.”
- A successful login redirects to `/projects`.
- Clicking **Create an account** moves to registration.

### Sessions, callbacks, and route protection

- Supabase SSR cookies persist the session across page loads.
- Middleware refreshes the user session on matched requests.
- Guests visiting protected routes are redirected to login.
- Signed-in users visiting login or registration are redirected to projects.
- The auth callback exchanges the email code for a session.
- Callback `next` destinations are accepted only when they begin with one `/`
  and are not protocol-relative URLs, preventing open redirects.
- Invalid or expired callback links return a visible login error.
- Clicking **Sign out** changes its text to **Signing out…**, ends the Supabase
  session, and redirects to login.

### Automatic profile creation

- A Postgres trigger creates a profile whenever Supabase Auth creates a user.
- The profile stores email, display name, creation time, and avatar color.
- Missing display names fall back to the part of the email before `@`.
- Avatar colors are chosen deterministically from a restrained six-color
  palette using the user ID.

## 3. Global workspace controls

### Sidebar

- Displays the Relay brand and “Project workspace” label.
- Lists only projects belonging to the signed-in user.
- Project summaries are deduplicated by project ID.
- Each project row shows its initial, name, and the current user's role.
- Clicking a project opens its Board.
- The active project is visually marked and exposed with `aria-current`.
- Clicking the **plus** icon beside Projects opens the create-project page.
- When a project is open, the sidebar shows the count and avatars of online
  project members, up to six avatars.
- Each online avatar has a tooltip naming the online member.
- When nobody is online, the sidebar shows “No one online.”

### Project switcher

- Clicking **Switch project** opens a native dialog.
- Pressing `Ctrl+K` on Windows/Linux or `Cmd+K` on macOS opens the same dialog.
- The search input receives focus when the dialog opens.
- Typing filters project names case-insensitively.
- Each result displays the project initial, name, and role.
- Clicking a result closes the dialog, clears the search, and opens that
  project's Board.
- Pressing Escape closes the native dialog.
- Closing the dialog clears the search query.
- An unmatched search displays “No matching projects.”

### Project header and tabs

- The header shows the project name, description, and current user's role.
- A project without a description displays “No project description.”
- Clicking **Chat**, **Board**, **Activity**, or **Members** changes project
  sections.
- The active tab is visually marked and uses `aria-current="page"`.
- Visiting `/projects/:id` directly redirects to Board.
- A project ID that is not in the current user's project list redirects to
  `/projects`.

### Theme control

- An icon theme button is available on authentication screens.
- A labeled theme button is available in the workspace sidebar.
- Clicking it switches between light and dark themes.
- The selection is saved under `relay-theme` in local storage.
- When no manual selection exists, the operating-system color preference is
  used.
- The theme is applied before hydration to prevent a light/dark flash.
- Toast notifications follow the active theme.
- Theme controls include accessible labels and tooltips describing the next
  theme action.

### Skip navigation

- Keyboard users can focus **Skip to main content** at the top of every page.
- Activating it moves focus/navigation past the repeated shell to the primary
  content area.

## 4. Project creation

- `/projects` shows **Create your first project** when no projects exist and
  **Create another project** otherwise.
- **Project name** is required, trimmed, and limited to 80 characters.
- **Description** is optional, trimmed, nullable, and limited to 2,000
  characters.
- Clicking **Create project** changes the button text to **Creating project…**
  while pending.
- The API derives the creator from the verified JWT, never the form body.
- The creator automatically becomes the project's first Owner.
- Project creation and its `project.created` activity entry are committed in
  one database transaction.
- Success redirects directly to the new Board.
- Validation, API, and database errors return to the form as visible messages.

## 5. Board and requirements

### Board layout

- Three columns are implemented: **To do**, **In progress**, and **Done**.
- Each column displays its live task count.
- Empty columns display “Drop a requirement here.”
- Columns highlight when a draggable task is over them.
- At narrow widths, columns retain usable density and scroll horizontally.

### Progress summary

- Displays “X of Y requirements done.”
- Computes and displays the rounded completion percentage.
- Shows a thin progress bar derived from current tasks.
- Displays up to five contributors who completed tasks.
- Each contributor displays an avatar initial and completion count.
- Hovering a contribution shows the member name and exact count.
- When no tasks are complete, it displays “No completions yet.”
- Counts, percentage, bar, and contributions update immediately from optimistic
  state and Realtime events.

### Live connection status

- Displays **Live** with a success dot while the database channel is subscribed.
- Displays **Reconnecting** with a warning dot when disconnected.
- The status is exposed as a polite live region for assistive technology.
- On every successful subscription, including reconnection, the client reloads
  the full permission-checked project snapshot.

### Assignee filter

- The filter defaults to **All assignees**.
- Opening it lists every current project member.
- Choosing a member shows only tasks assigned to that member.
- Filtering affects every column but does not modify stored tasks.

### Creating a requirement

- Clicking **New requirement** opens the task drawer.
- Pressing `n` outside an input, textarea, select, or editable element opens the
  same drawer.
- Viewer accounts see the button disabled with a tooltip explaining why.
- The new-task drawer focuses the title field.
- New tasks always begin in **To do**.
- New tasks receive a position after the current last To-do task.
- The UI inserts a temporary task immediately using a browser-generated UUID.
- A successful API response replaces the temporary task and shows a success
  toast.
- A failed request removes the temporary task and shows the API error in a
  toast.

### Task cards

- Display the title, priority marker, priority label, and assignee state.
- Priorities are **low**, **medium**, **high**, and **urgent**.
- Assigned cards display the assignee's colored initial and name tooltip.
- Unassigned cards display “Unassigned.”
- Clicking the main card body opens its details drawer.
- Clicking/using the separate drag handle initiates movement rather than opening
  the card.
- The drag handle has an accessible “Move [title]” label.
- Viewer drag handles are disabled and explain that Viewers cannot move tasks.

### Task drawer

- Opens as a labeled native modal dialog from a card, the New button, the `n`
  shortcut, or an Activity deep link.
- Displays **New requirement** or **Requirement details** depending on context.
- Editable fields are title, description, priority, and assignee.
- Title is required and limited to 200 characters.
- Description is optional and limited to 4,000 characters.
- Assignee choices are limited to current project members plus Unassigned.
- Clicking **Save requirement** changes the label to **Saving…** while pending.
- Clicking the **X**, clicking **Cancel**, or pressing Escape closes the drawer.
- Clicking **Delete** optimistically removes an existing task and closes the
  drawer.
- Delete failures restore the task and show an error toast.
- Editing failures restore the previous task and show an error toast.
- Users without edit/delete rights see disabled fields or controls with a
  permission explanation.

### Drag and drop

- Supports pointer dragging with a six-pixel activation distance to reduce
  accidental drags.
- Supports keyboard dragging through dnd-kit keyboard coordinates.
- Tasks can move between columns or be reordered relative to another task.
- Fractional numeric positions avoid rewriting every task in a column.
- Movement updates status and position optimistically.
- Moving to Done records the current user and completion timestamp.
- Moving out of Done clears completion attribution and timestamp.
- A failed move restores the exact previous task and shows an error toast.
- Owner, Admin, and Member roles can change task status; Viewer cannot.

### Task permission behavior

- Owner and Admin can create, edit, delete, and move any task.
- Member can create tasks and move any task.
- Member can edit a task only when they created it or are its assignee.
- Member can delete a task only when they created it.
- Viewer can open/read task details but cannot create, edit, delete, or move.
- The API repeats every permission check; disabled UI controls are not the
  security boundary.

### Activity generated by tasks

- Create emits `task.created`.
- Editing title, description, or priority emits `task.updated`.
- Changing assignee emits `task.assigned`.
- Moving status emits `task.status_changed` with old and new status.
- Delete emits `task.deleted`.
- Every event is inserted in the same Postgres transaction as its task change.

## 6. Activity feed

- Loads the latest 50 project activity entries in descending time order.
- New activity is prepended live and deduplicated by ID.
- Client activity state remains capped at 50 entries.
- Human-readable sentences are implemented for:
  - Project created and updated
  - Task created, updated, assigned, deleted, and moved between statuses
  - Member joined, removed, and role changed
  - Message posted
- Entries show the actor's colored initial.
- Former or unavailable actors fall back to stored activity names or a generic
  former-member label.
- Relative timestamps use seconds, minutes, hours, then days.
- Relative time text refreshes every 60 seconds.
- Hovering a timestamp exposes the full localized date/time.

### Activity controls

- **Everyone** filters by a specific member when changed.
- **All events** filters by a specific event type when changed.
- Both filters combine when both are selected.
- When an event references a task that still exists, clicking **Open** navigates
  to Board with the task ID and automatically opens its drawer.
- Deleted/missing tasks do not display the Open link.
- No matching entries display a dedicated empty-filter state.
- The feed is a polite live region so new entries can be announced.

## 7. Project chat

### History and rendering

- The initial snapshot includes the latest 50 messages in chronological display
  order.
- When exactly 50 messages are present, **Load older messages** is shown.
- Clicking it requests up to 50 messages older than the earliest visible
  timestamp.
- While loading, the button displays **Loading…** and prevents duplicate loads.
- Older messages are deduplicated by ID.
- The previous scroll position is preserved after older messages are prepended.
- The Load Older control disappears when a page returns fewer than 50 rows.
- An empty conversation displays “No messages yet. Start with a useful update.”
- Each message displays author, avatar initial, local time, and body.
- Messages from a deleted/former member use “Former member.”
- Consecutive messages from the same author within five minutes are visually
  grouped without repeating the avatar/header.
- Message whitespace and line breaks are preserved.

### Sending

- The composer accepts up to 4,000 characters.
- Clicking the send icon sends a non-empty trimmed message.
- Pressing Enter sends.
- Pressing Shift+Enter inserts a newline.
- Empty/whitespace-only messages cannot be sent.
- The composer and send button are disabled during an in-flight send to prevent
  duplicate submission.
- Sending inserts a temporary message immediately and pins scrolling to the
  bottom.
- Success replaces the temporary message with the committed database message.
- Failure removes the temporary message, restores the draft, and shows an error
  toast.
- The API allows at most 30 post attempts per minute per rate-limit identity and
  returns standard rate-limit headers.
- Viewer sees the history but gets a disabled composer reading “Viewers can read
  chat but cannot post.”

### Autoscroll

- New messages scroll smoothly to the bottom while the user is already within
  80 pixels of the bottom.
- Scrolling farther up disables automatic scrolling so reading history is not
  interrupted.
- Sending the current user's message re-enables bottom pinning.

### Typing

- Non-empty typing broadcasts `{ userId, name }` over the private project
  channel.
- Broadcasts are throttled to at most once per second per local composer.
- The current user's own typing event is ignored.
- The UI lists up to two typing names and summarizes additional typers as
  “and N more.”
- Each remote typing state automatically clears three seconds after its most
  recent event.
- Typing text is exposed through a polite live region.

### Message activity and transactionality

- A posted message and its `message.posted` activity entry commit together in a
  single RPC transaction.
- Committed messages arrive through Postgres Changes and are deduplicated
  against optimistic messages.

## 8. Members, roles, and online state

### Member list

- Displays the total number of people with project access.
- Each row shows colored avatar initial, display name, email, role, and online
  dot.
- The current user is marked with “(you).”
- Online/offline dots provide both a tooltip and accessible label.
- Membership insert, update, and delete events update the list live.

### Adding a member

- The invite panel explains that the person must already have a Relay account.
- Email is required and validated.
- Owner can choose Owner, Admin, Member, or Viewer.
- Admin can choose only Member or Viewer.
- Member and Viewer cannot use the invitation controls.
- Disabled inputs/buttons explain that only Owners and Admins can add members.
- Clicking **Add member** changes the label to **Adding…** while pending.
- The API looks up the existing profile by normalized email.
- Success returns to Members with “Member added.”
- Duplicate membership returns a conflict rather than creating another row.
- Failure returns a visible error message.
- Adding the membership and `member.joined` activity entry is transactional.

### Changing a role

- Allowed next roles are calculated per target and per current actor.
- Clicking **Save** changes the button label to **Saving…** while pending.
- Owner can manage roles while preserving at least one Owner.
- Admin can change only Member/Viewer targets and only between Member/Viewer.
- Admin cannot touch Owner/Admin memberships or grant Owner/Admin.
- Member and Viewer cannot change roles.
- The last Owner's selector is disabled with an explanation.
- Success returns with “Role updated”; failure returns a visible error.
- The database locks the project/membership rows and independently protects the
  last-Owner invariant.
- Role change and `member.role_changed` activity commit together.

### Removing and leaving

- Clicking **Remove** removes another member when allowed.
- Clicking **Leave** removes the current user's own membership.
- The pending label changes to **Removing…** or **Leaving…**.
- Any role may leave voluntarily except the last Owner.
- Owner can remove members while preserving an Owner.
- Admin can remove Member/Viewer only.
- Member and Viewer cannot remove other users.
- Disabled controls explain last-Owner or role restrictions.
- Success returns with “Member removed.”
- Removal and `member.removed` activity commit together.
- The API and database both reject removal of the last Owner with a conflict.
- If the current user's membership is removed in another browser, Realtime
  marks access removed and redirects to `/projects?removed=1`.

## 9. Roles and permissions

One pure `can(role, action, context)` function in the shared workspace drives
both API authorization and UI availability.

| Action | Owner | Admin | Member | Viewer |
| --- | --- | --- | --- | --- |
| View project | Yes | Yes | Yes | Yes |
| Update project | Yes | Yes | No | No |
| Delete project | Yes | No | No | No |
| Invite member | Yes | Yes | No | No |
| Remove member | Yes, except last Owner | Member/Viewer targets only | Self only | Self only |
| Change member role | Yes, except demoting last Owner | Member/Viewer targets and roles only | No | No |
| Create task | Yes | Yes | Yes | No |
| Edit task | Yes | Yes | Creator or assignee | No |
| Delete task | Yes | Yes | Creator only | No |
| Change task status | Yes | Yes | Yes | No |
| Post message | Yes | Yes | Yes | No |

The project update and delete capabilities are implemented in the API and
transactional database functions. The current frontend does not expose project
settings buttons for those two backend operations.

## 10. Realtime synchronization

### Project database channel

- One `project:{id}:db` channel is created for the open project.
- It subscribes with `project_id=eq.{id}` filters to:
  - All task INSERT/UPDATE/DELETE events
  - All membership INSERT/UPDATE/DELETE events
  - Activity INSERT events
  - Message INSERT events
- Task inserts/updates upsert by ID; deletes remove by ID.
- Membership inserts/updates fetch the related profile and upsert by user ID;
  deletes remove by user ID.
- Activity inserts prepend and deduplicate.
- Message inserts append/upsert and deduplicate.
- The channel marks the UI Live only after `SUBSCRIBED`.
- Every subscription or reconnection refetches and replaces the complete
  project snapshot to repair missed events.

### Private Presence and Broadcast channel

- One `project:{id}:presence` channel is configured with `private: true`.
- Presence tracks `{ userId, name, color, lastSeen }`.
- The user's ID is the Presence key.
- Presence synchronization deduplicates online user IDs.
- Broadcast carries the `typing` event.
- Two RLS policies on `realtime.messages` allow authenticated SELECT/INSERT for
  Presence/Broadcast only when `is_project_member()` succeeds for the project
  encoded in the channel topic.
- Channel cleanup clears typing timers and removes both Supabase channels when
  the project view unmounts.

## 11. Client state and failure recovery

- Zustand stores the active project ID, tasks, members, activity, messages,
  connection state, removed state, online IDs, and typing users.
- Generic ID-based upserts prevent duplicate tasks, messages, and activity.
- Membership upserts deduplicate by user ID.
- Online IDs are deduplicated with a Set.
- Typing entries replace the previous entry for the same user.
- Replacing a snapshot preserves Presence/typing only when staying on the same
  project and clears them when switching projects.
- Task create/edit/delete/move and message send use optimistic state.
- Each optimistic mutation has an explicit rollback path and error toast.
- Browser API requests obtain the current Supabase access token and attach it
  as a Bearer token.
- Missing browser/server sessions return an explicit expired-session error.
- API requests parse structured error messages and provide a safe generic
  fallback.

## 12. Loading, empty, pending, and error states

- Project routes show skeleton layouts rather than full-page spinners.
- Skeletons represent the sidebar, project heading, tabs, progress summary,
  columns, and cards.
- Route skeletons expose `aria-busy` and a loading label.
- Project errors display a dedicated alert explaining that project data was not
  changed.
- Clicking **Try again** invokes the Next.js error-boundary reset.
- The retry button includes a reset icon.
- Form submit buttons use pending labels and disable themselves while pending.
- Empty project, column, activity-filter, chat, online-member, and contribution
  states each have specific copy instead of generic blanks.
- Toasts report task and chat success/error results.
- Server-action forms report authentication, project, and membership errors
  inline.

## 13. Accessibility and interaction polish

- Semantic main, nav, section, article, header, time, form, fieldset, and dialog
  elements are used throughout.
- Inputs and selects have visible labels or accessible labels.
- Native dialogs support Escape cancellation and focus containment.
- The task dialog uses `aria-labelledby`.
- Focus-visible controls receive a two-pixel focus ring.
- Disabled role-aware controls provide explanatory titles/tooltips.
- Active navigation uses `aria-current`.
- New chat/activity content, typing text, and connection state use polite live
  regions.
- Toasts are rendered by an application-level Sonner region.
- Drag handles have action-specific accessible names.
- Counts use compact, tabular-number styling.
- `prefers-reduced-motion` disables smooth scrolling, long transitions, and
  repeating skeleton animation.
- Layouts remain usable down to 768px; dense board columns scroll instead of
  collapsing into unreadable cards.
- Auth screens adapt to a single column below the primary desktop breakpoint.
- The design uses a neutral scale and one restrained green accent.
- There are no gradients, glassmorphism, decorative blobs, emoji controls, or
  colored glow effects.
- Shadows are limited to dialogs, the task drawer, and the actively dragged
  card.
- Lucide icons are used for interface icons.

## 14. API endpoints

Every `/projects` endpoint requires a valid Supabase Bearer token. Every route
with `:id` also reloads the caller's current membership from the database.

| Method and path | Implemented result | Main permission |
| --- | --- | --- |
| `GET /health` | Service health response | Public |
| `POST /projects` | Create project and first Owner membership | Authenticated user |
| `PATCH /projects/:id` | Update name/description | Owner/Admin |
| `DELETE /projects/:id` | Delete project | Owner |
| `GET /projects/:id/snapshot` | Project, members, tasks, progress, contributions, latest activity/messages | Any member |
| `POST /projects/:id/members` | Add existing user by email | Owner/Admin with role limits |
| `PATCH /projects/:id/members/:userId` | Change role | Owner/Admin with target limits |
| `DELETE /projects/:id/members/:userId` | Remove another user or leave | Role rules plus last-Owner guard |
| `POST /projects/:id/tasks` | Create task | Owner/Admin/Member |
| `PATCH /projects/:id/tasks/:taskId` | Edit title/description/priority/assignee | Owner/Admin or Member creator/assignee |
| `PATCH /projects/:id/tasks/:taskId/status` | Move/reorder task | Owner/Admin/Member |
| `DELETE /projects/:id/tasks/:taskId` | Delete task | Owner/Admin or Member creator |
| `GET /projects/:id/messages` | Cursor-style history page, default/max 50 | Any member |
| `POST /projects/:id/messages` | Post message and activity | Owner/Admin/Member |

### API platform behavior

- Helmet security headers are enabled.
- `X-Powered-By` is disabled.
- CORS accepts only the configured `WEB_ORIGIN`.
- Allowed CORS methods are GET, POST, PATCH, and DELETE.
- Allowed custom headers are Authorization and Content-Type.
- JSON request bodies are limited to 32 KB.
- Unknown routes return structured 404 errors.
- Zod failures return structured 400 errors with flattened validation details.
- Permission failures return 403.
- Invalid/missing/expired tokens return 401.
- Duplicate rows and database constraints map to 409 conflicts.
- Missing database records map to 404.
- Unexpected errors return a generic 500 response without exposing secrets.

## 15. JWT and request identity security

- The API requires `Authorization: Bearer <access token>`.
- JWT signatures are verified with Supabase's remote JWKS using JOSE.
- Verification checks issuer, `authenticated` audience, expiration/signature,
  and presence of the subject.
- The caller ID comes only from the verified JWT `sub`.
- The API never accepts an actor/user identity from a mutation body.
- Membership role is loaded from Postgres for each project request rather than
  trusted from JWT custom claims or browser state.
- Supabase signing-key rotation is supported through remote JWKS caching.

## 16. Shared validation limits

| Value | Rules |
| --- | --- |
| Email | Trimmed valid email, maximum 254 characters |
| Password | 8–128 characters |
| Display name | Trimmed, 2–60 characters |
| Project ID, task ID, user ID | UUID |
| Project name | Trimmed, 1–80 characters |
| Project description | Trimmed, nullable/optional, maximum 2,000 characters |
| Project role | `owner`, `admin`, `member`, or `viewer` |
| Task title | Trimmed, 1–200 characters |
| Task description | Trimmed, nullable/optional, maximum 4,000 characters |
| Task priority | `low`, `medium`, `high`, or `urgent` |
| Task status | `todo`, `in_progress`, or `done` |
| Task position | Finite number |
| Message body | Trimmed, 1–4,000 characters |
| Message page size | Integer 1–50; defaults to 50 |
| Message `before` cursor | Offset-aware ISO date/time |

The same shared Zod package is imported by the API and relevant Next.js server
actions.

## 17. Database model and guarantees

### Tables

- `profiles`: Auth-linked user identity, email, display name, avatar color, and
  creation time.
- `projects`: Name, description, creator, and creation time.
- `memberships`: Composite `(project_id, user_id)` primary key and project role.
- `tasks`: Project, content, status, priority, assignee, creator, completion
  attribution, fractional position, and timestamps.
- `messages`: Project, author, body, and creation time.
- `activity_log`: Project, optional actor, event type, JSON payload, and creation
  time.

### Indexes

- Membership lookup by user.
- Task lookup/order by project, status, and position.
- Message history by project and descending creation time.
- Activity history by project and descending creation time.

### Triggers and views

- Auth-user insert creates a profile.
- Task update automatically updates `updated_at`.
- Task status changes set `completed_at` when entering Done and clear completion
  data when leaving Done.
- `project_progress` is a security-invoker view counting total and Done tasks.
- `member_contributions` is a security-invoker view counting Done tasks by
  `completed_by`.

### Transactional functions

- Create, update, and delete project operations.
- Add, remove, and change-role membership operations.
- Create, edit, move, and delete task operations.
- Post message operation.
- Mutations lock relevant rows where needed.
- Assigning a task to a non-member is rejected at the database layer.
- Removing/demoting the final Owner is rejected at the database layer.
- Transaction functions are revoked from public, anon, and authenticated roles
  and granted only to `service_role`.

### Activity event types

- `project.created`
- `project.updated`
- `project.deleted`
- `member.joined`
- `member.removed`
- `member.role_changed`
- `task.created`
- `task.updated`
- `task.assigned`
- `task.status_changed`
- `task.deleted`
- `message.posted`

## 18. Row Level Security

- RLS is enabled on profiles, projects, memberships, tasks, messages, and
  activity.
- Authenticated users can select a project only when they are a member.
- Membership, task, message, and activity reads call `is_project_member()`.
- Profiles are visible to the user themselves or users sharing a project.
- Application tables intentionally have no authenticated INSERT, UPDATE, or
  DELETE policies, so direct browser writes fail.
- Authenticated grants are SELECT-only for application tables/views.
- The service role has the backend access required by Express.
- Security-definer membership helpers use a fixed `public` search path.
- Non-members receive zero rows for protected project data.

## 19. Seed data

`npm run seed` idempotently prepares:

- Five confirmed demo users: Owner, Admin, two Members, and Viewer.
- Deterministic profile names, roles, and avatar colors.
- One deterministic demo project.
- Five project memberships.
- Fifteen requirements across statuses and priorities.
- Twenty chat messages.
- Twenty-five activity entries.
- A printed credential table after success.

Every demo account uses `Password123!`:

| Role | Email | Display name |
| --- | --- | --- |
| Owner | `owner@relay.demo` | Maya Chen |
| Admin | `admin@relay.demo` | Theo Martin |
| Member | `member1@relay.demo` | Sara Malik |
| Member | `member2@relay.demo` | Jon Bell |
| Viewer | `viewer@relay.demo` | Nina Patel |

## 20. Database migrations

| Migration | Implemented scope |
| --- | --- |
| `0001_init.sql` | Enums, tables, indexes, profile/task triggers, progress/contribution views |
| `0002_rls.sql` | Membership helper functions, RLS, SELECT grants, service grants |
| `0003_mutations.sql` | Initial project/task-status/member-role RPCs |
| `0004_realtime.sql` | Adds tasks, messages, activity, and memberships to Realtime publication |
| `0005_projects_members.sql` | Complete project and membership RPCs/invariants |
| `0006_tasks.sql` | Complete task create/edit/delete RPCs and activity payloads |
| `0007_messages.sql` | Atomic message posting and message activity |
| `0008_realtime_authorization.sql` | Private Presence/Broadcast membership policies |

- `supabase/setup.sql` is generated from all ordered migrations for a fresh
  hosted Supabase database.
- `npm run db:bundle` regenerates that bundle.
- The project also contains Supabase CLI configuration for optional linked
  deployments.

## 21. Developer commands and runtime behavior

| Command | Implemented behavior |
| --- | --- |
| `npm install` | Installs all npm workspaces plus project-local Supabase CLI. |
| `npm run dev` | Builds shared/API code, starts API TypeScript watching, restarts compiled API on changes, and starts Next.js. |
| `npm run seed` | Runs the idempotent hosted-project demo seed. |
| `npm test` | Builds shared types and runs all workspace Vitest suites. |
| `npm run typecheck` | Runs strict TypeScript checks in all workspaces. |
| `npm run build` | Builds shared, API, and optimized Next.js production output. |
| `npm run check:web-secrets` | Scans compiled web output for backend secret names and the configured service key. |
| `npm run verify:rls` | Creates a temporary outsider, proves protected reads are empty/direct task write fails, then removes the user. |
| `npm run db:bundle` | Rebuilds `supabase/setup.sql` from ordered migration files. |
| `npm run supabase -- …` | Runs the pinned project-local Supabase CLI. |

- The repository is an npm-workspaces monorepo with `web`, `api`, and `shared`.
- TypeScript strict mode and unused-code checks are enabled.
- Next.js development output uses `web/.next-dev` while production uses
  `web/.next`, preventing build/dev Webpack cache collisions.
- Environment parsing fails early when required backend settings are missing or
  invalid.
- Local `.env` files, build outputs, coverage, Supabase temp files, logs, and
  TypeScript build metadata are ignored by Git.

## 22. Automated test coverage

Nineteen automated tests are currently implemented:

- Seven shared permission tests:
  - Every role/action matrix row
  - Member creator/assignee edit conditions
  - Admin elevated-membership restrictions
  - Last-Owner removal/demotion invariant
- Twelve API tests:
  - Health endpoint
  - Member task creation
  - Viewer task-create denial
  - Non-member denial across snapshot/task routes
  - Admin cannot promote to Owner
  - Last-Owner demotion returns conflict
  - Self-leave behavior
  - Non-member denial across project/member routes
  - Member message posting
  - Viewer message-post denial
  - Message history pagination
  - Non-member chat read/post denial

## 23. Security verification tooling

- `verify:rls` signs in a newly created user who is not a member of the demo
  project.
- It verifies zero returned rows from projects, tasks, memberships, messages,
  and activity.
- It attempts a direct browser-style task insert and requires it to fail.
- It removes the temporary user in a `finally` block even when verification
  throws.
- `check:web-secrets` scans the production web build for backend-only secret
  identifiers and the configured service-role value.
- API tests verify representative authorization and non-member denial cases.

## 24. Deliberate implementation boundaries

The following are intentionally not presented as implemented product features:

- No threads, direct messages, file uploads, email notifications, OAuth,
  billing, mobile app, or multiple channels per project.
- Project update/delete exist in the API/database but currently have no settings
  screen in the frontend.
- Chat has project history pagination but no message editing/deletion/reactions.
- Activity keeps the latest 50 entries in the project snapshot and has no older
  activity pagination control.
- Presence and typing are ephemeral and are not stored as durable history.
- The current rate limiter is process-local rather than shared across multiple
  API instances.
- Browser end-to-end tests are not yet included; current automated coverage is
  shared unit tests and API integration-style route tests.
