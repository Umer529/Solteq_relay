# Relay two-minute demo

## Before recording

1. Run `npm run dev` and confirm the API health endpoint returns JSON.
2. Open two browser windows side by side.
3. Sign in as `owner@relay.demo` in the first and `viewer@relay.demo` in the
   second. Both passwords are `Password123!`.
4. Open the seeded project Board in both windows.

## Script

### 0:00–0:15 — Workspace

“Relay keeps project requirements, decisions, and conversation in one live
workspace. It uses a dense, responsive interface with persistent light and dark
themes.”

- Toggle the theme once.
- Press `Ctrl/Cmd+K`, show the project switcher, then press Escape.

### 0:15–0:50 — Requirements and live progress

“The board supports keyboard-accessible drag and drop, priorities, assignees,
and role-aware controls. Writes are optimistic but roll back if the API rejects
them.”

- In the Owner window, press `n`, create a short requirement, and assign it.
- Drag that requirement to Done.
- Point to the Viewer window updating without a refresh: the card, completed
  total, progress bar, and member contribution count all change live.

### 0:50–1:10 — Activity and audit trail

“Every state-changing mutation writes its activity record in the same database
transaction.”

- Open Activity in the Viewer window.
- Show the new task events, relative timestamps, user/type filters, and the task
  link that opens the Board drawer.

### 1:10–1:30 — Roles and permissions

“Owner, Admin, Member, and Viewer permissions come from one shared policy used
by both the API and UI. The API reloads membership on every request.”

- Open Members and show roles plus online dots.
- Point out that the Viewer cannot add members, change roles, or mutate tasks.
- Mention the last-Owner invariant.

### 1:30–1:50 — Chat, typing, and Presence

“Each project has paginated chat, private Presence, and throttled typing
Broadcasts.”

- Type in the Owner window and show the typing indicator in the Viewer window.
- Send with Enter and show the message arrive live.
- Point out that Viewer chat is read-only.

### 1:50–2:00 — Security close

“Browser reads are protected by Row Level Security; all writes go through the
Express API, which verifies Supabase JWTs and executes transactional RPCs. A
non-member receives zero project rows and cannot join private project Presence.”

- End on the live Board with both browser windows visible.
