# Relay

Relay is a real-time project collaboration app built as an npm-workspaces
monorepo. This repository currently contains the M1 foundation: Supabase
schema and security policies, email/password authentication, an Express API
shell, and deterministic demo data.

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project, or the Supabase CLI plus Docker for local development

## Foundation setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `web/.env.example` to `web/.env.local` and `api/.env.example` to
   `api/.env`. Fill them with keys from the same Supabase project. The service
   role key must only be placed in `api/.env`.

3. Apply the migrations with the Supabase CLI:

   ```sh
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   For a fully local stack, use `npx supabase start` followed by
   `npx supabase db reset` and use the printed local keys in both env files.

4. Populate the deterministic demo workspace:

   ```sh
   npm run seed
   ```

5. Start the web and API services together:

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
