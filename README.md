# Relay

Relay is a real-time project collaboration app built as an npm-workspaces
monorepo. This repository currently contains the M1 foundation: Supabase
schema and security policies, email/password authentication, an Express API
shell, and deterministic demo data.

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
