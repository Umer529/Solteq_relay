# Free Production Deployment Guide: Relay

This guide walks you through deploying **Relay** 100% free with production-ready services:
1. **Supabase** (Database, Auth, Realtime) — Free Tier
2. **Render** (Express Backend API) — Free Web Service
3. **Vercel** (Next.js Frontend) — Free Hobby Tier

---

## Architecture Overview

```
[ Vercel: Next.js Frontend ] 
   │                      │
   │ Authenticated Reads  │ Bearer JWT + Mutations
   ▼                      ▼
[ Supabase Hosted ]   [ Render: Express API ]
  - Postgres + RLS        - Token Verification (JOSE/JWKS)
  - Auth Service          - Transactional RPC Calls
  - Realtime WS           - Origin-Restricted CORS
```

---

## Step 1: Hosted Supabase Setup (Database, Auth, Realtime)

If you haven't set up your hosted Supabase project yet:

1. Go to [database.new](https://database.new) and create a free project.
2. Note your **Database Password** and choose a region close to your users.
3. Once provisioned, open **SQL Editor → New query**.
4. Copy the entire contents of [`supabase/setup.sql`](./supabase/setup.sql) and paste it into the SQL editor.
5. Click **Run**. This establishes:
   - All tables, constraints, triggers, and indexes.
   - Row Level Security (RLS) policies.
   - Transactional mutation RPCs (`create_task_transaction`, etc.).
   - Realtime publication on `tasks`, `messages`, `activity_log`, etc.
   - Private presence and broadcast authorization policies.
6. Configure Authentication URLs:
   - Go to **Project Settings → Authentication → URL Configuration**.
   - Under **Site URL**, you will put your Vercel URL once created (e.g. `https://your-relay-app.vercel.app`), or `http://localhost:3000` temporarily.
   - Under **Redirect URLs**, add:
     - `https://your-relay-app.vercel.app/auth/callback`
7. Collect your credentials from **Project Settings → API**:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon / public** key (Safe for browser/frontend)
   - **service_role** key (Secret! Backend API only)

*(Optional: Run `npm run seed` locally with these credentials pointing to your hosted project if you want the sample project and users seeded).*

---

## Step 2: Deploy Backend API to Render (Free)

Render offers free web services suitable for Node.js backends.

1. Push your latest code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: add deployment scripts and guide"
   git push origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
3. Click **New +** → **Web Service**.
4. Select your repository: `SoltecQ-Work-Repo`.
5. Configure the service settings:
   - **Name**: `relay-api` (or any name you prefer)
   - **Region**: Choose the region closest to your Supabase project (e.g., Frankfurt, Oregon, Ohio).
   - **Branch**: `main`
   - **Root Directory**: *(leave blank / default root)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build:api
     ```
   - **Start Command**:
     ```bash
     npm run start:api
     ```
   - **Instance Type**: `Free`
6. Add the following **Environment Variables** in Render:
   - `NODE_ENV` = `production`
   - `SUPABASE_URL` = `<your-supabase-project-url>`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-key>`
   - `WEB_ORIGIN` = `https://your-app.vercel.app` *(You can temporarily set this to `*` or update it in 2 minutes after Step 3)*
7. Click **Create Web Service**.
8. Render will build and deploy the API. Once deployed, note your Render URL:
   - Example: `https://relay-api-xxxx.onrender.com`
   - You can test it by visiting `https://relay-api-xxxx.onrender.com/health` in your browser. It should respond `{"status":"ok"}`.

---

## Step 3: Deploy Frontend to Vercel (Free)

Vercel provides native Next.js hosting with zero-config edge routing.

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. Import your GitHub repository `SoltecQ-Work-Repo`.
4. In the project configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and leave it as `./` (the root repository).
   - **Build and Output Settings**:
     - Toggle **Build Command** override ON and set:
       ```bash
       npm run build:web
       ```
     - Toggle **Output Directory** override ON and set:
       ```bash
       web/.next
       ```
     - Toggle **Install Command**: leave default (`npm install`).
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `<your-supabase-project-url>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
   - `NEXT_PUBLIC_API_URL` = `<your-render-api-url>` (e.g., `https://relay-api-xxxx.onrender.com`)
6. Click **Deploy**.
7. Vercel will install dependencies, compile `@relay/shared`, build `@relay/web`, and generate your production deployment.
8. Once complete, you will receive your production URL (e.g. `https://relay-app.vercel.app`).

---

## Step 4: Final Linkage & CORS

Now that you have both live URLs:

1. **Update Render API**:
   - In Render Dashboard → `relay-api` → **Environment**.
   - Set `WEB_ORIGIN` = `https://relay-app.vercel.app` (your actual Vercel domain, without trailing slash).
   - Save changes. Render will automatically redeploy with the strict CORS policy.
2. **Update Supabase Auth**:
   - In Supabase Dashboard → **Authentication** → **URL Configuration**.
   - Set **Site URL**: `https://relay-app.vercel.app`
   - In **Redirect URLs**, ensure `https://relay-app.vercel.app/auth/callback` is present.

---

## Step 5: Verification Checklist

1. Open your live Vercel URL in your browser.
2. Register a new account or log in with a seeded user.
3. Check project list and open a project board.
4. Open the same project in an incognito window with another user to verify:
   - Live drag-and-drop task movements update in real-time.
   - Chat messaging streams instantly.
   - Green presence dots reflect online/offline status.
   - Activity feed logs changes dynamically.
