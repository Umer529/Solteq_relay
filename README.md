# Relay

Relay is a real-time project collaboration app built as an npm-workspaces
monorepo. It currently includes authentication, project roles, a live task
board and progress, an activity feed, project chat, Presence, and typing.

## Prerequisites

- Node.js 20 or newer
- npm
- A hosted Supabase project

## Foundation setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a hosted Supabase project. No Docker installation is required.

3. In the Supabase dashboard, open **SQL Editor → New query**, paste the full
   contents of `supabase/setup.sql`, and select **Run**. This file is generated
   from the ordered migrations with `npm run db:bundle`.

   Alternatively, deploy the migrations with the project-local CLI:

   ```sh
   npm run supabase -- login
   npm run supabase -- link --project-ref YOUR_PROJECT_REF
   npm run supabase -- db push
   ```

4. Copy `web/.env.example` to `web/.env.local` and `api/.env.example` to
   `api/.env`. Fill them with keys from the same Supabase project. The service
   role key must only be placed in `api/.env`.

5. Populate the deterministic demo workspace:

   ```sh
   npm run seed
   ```

6. Start the web and API services together:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000`. The API health endpoint is
   `http://localhost:4000/health`.

## M1 verification

Run the local checks:

```sh
npm run typecheck
npm test
npm run build
npm run check:web-secrets
```

To prove that a non-member cannot read project rows or write directly, add the
anon key to `api/.env` and run:

```sh
npm run verify:rls
```

The script creates a temporary confirmed user, performs protected reads and a
direct write as that user, asserts the expected RLS behavior, and deletes the
temporary user.

## M3 database update

If the M1/M2 setup is already installed, run only
`supabase/migrations/0006_tasks.sql` in the hosted Supabase SQL Editor. Do not
rerun `setup.sql` against an existing schema; that bundle is intended for a new
project.

The M3 board uses two channels in parallel: authenticated REST mutations go
through Express, while committed task and membership rows stream back through
Supabase Realtime. On every Realtime subscription or reconnection, the browser
reloads the permission-checked project snapshot before continuing.

For the manual live check, sign in as the seeded Owner in one browser and the
Viewer in a private browser window. Open the same Board in both, then move a
requirement as the Owner. The Viewer should see the card, progress count, bar,
and contribution count update without refreshing. The Viewer controls remain
read-only.

## M4 database update

For an existing M3 database, run these files in order in the hosted Supabase
SQL Editor:

1. `supabase/migrations/0007_messages.sql`
2. `supabase/migrations/0008_realtime_authorization.sql`

Do not rerun `supabase/setup.sql` on an existing database. Migration `0007`
adds the transactional message function, while `0008` authorizes only project
members to join each project's private Presence and typing channel.

To check M4 manually, open the same project in two browsers. A posted message,
activity item, online dot, and typing indicator should appear live in the other
browser. Chat history loads older messages in pages, Enter sends, Shift+Enter
adds a line, and Viewer accounts remain read-only. Run `npm run verify:rls` to
confirm that an authenticated non-member receives no project, membership,
task, message, or activity rows and cannot write directly.

## Realtime event reference

| Source | Event | Client reaction |
| --- | --- | --- |
| `tasks` INSERT/UPDATE/DELETE | Task changed | Update board, progress, and contributions |
| `memberships` INSERT/UPDATE/DELETE | Membership changed | Update members, roles, and UI permissions |
| `messages` INSERT | New message | Append to chat, deduplicated by ID |
| `activity_log` INSERT | New activity | Prepend to the filtered activity feed |
| Presence sync/join/leave | Online users changed | Update sidebar and member online dots |
| Broadcast `typing` | Member is typing | Show typing text and clear it after three seconds |

## Demo credentials

The seed prints these credentials after each successful run. Every account
uses `Password123!`.

| Role | Email |
| --- | --- |
| Owner | `owner@relay.demo` |
| Admin | `admin@relay.demo` |
| Member | `member1@relay.demo` |
| Member | `member2@relay.demo` |
| Viewer | `viewer@relay.demo` |

## JWT verification decision

The API verifies access tokens against Supabase's JWKS endpoint with `jose`,
including issuer, audience, expiration, signature, and subject checks. This
supports signing-key rotation and avoids distributing the JWT signing secret.
The service-role key remains backend-only and is separately checked against the
compiled web output.
