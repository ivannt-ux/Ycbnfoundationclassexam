# YCBN Foundation Bible School Exam

Next.js app: intake form → ready screen → 10-question exam → Supabase.
Leader access is gated by a passcode checked server-side.

## Project structure

```
ycbn-exam/
  app/
    layout.js
    page.js                        ← the whole exam UI
    api/admin/responses/route.js   ← passcode check + admin data read
  lib/
    supabaseClient.js              ← browser-safe (anon key)
    supabaseAdmin.js               ← server-only (service role key)
  public/
    logo.png                       ← your community logo
  supabase-schema.sql              ← run this once in Supabase
  .env.local.example               ← copy to .env.local, fill in real values
  package.json
```

## One-time setup

1. **Supabase table** — already done if you ran `supabase-schema.sql`
   successfully. If you get "relation already exists," check the Table
   Editor first — you probably already have it.

2. **Get your keys** — Supabase → Project Settings → API:
   - Project URL
   - `anon` `public` key
   - `service_role` key (keep this one secret — server only)

3. **Local development:**
   ```
   cd ycbn-exam
   cp .env.local.example .env.local
   ```
   Open `.env.local` and paste in your real Supabase URL, anon key,
   service role key, and set `ADMIN_PASSCODE=1611`.

   ```
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Deploying

1. Push this folder to a new GitHub repo:
   ```
   git init
   git add .
   git commit -m "Initial exam site"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
   (`.env.local` is git-ignored — your keys never get committed.)

2. Go to vercel.com → **Add New Project** → import that GitHub repo.
   Vercel auto-detects Next.js.

3. Before deploying, add the same four variables from `.env.local` under
   **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSCODE`

4. Deploy. You'll get a live URL you can send to students.

## How the pieces fit together

- **Submitting an exam** — the browser talks directly to Supabase using
  the anon key. The RLS policy only allows `insert`, so this is safe
  even though the key is public.
- **Leader access** — entering the passcode calls `/api/admin/responses`,
  a server route. It checks the passcode against `ADMIN_PASSCODE` (an
  env var, never shipped to the browser), and only then uses the
  service role key to read every response. Someone opening dev tools in
  their browser cannot get at the data directly — the anon key has no
  read permission at all.
- **Exam window** — `EXAM_START` / `EXAM_END` in `app/page.js` control
  when the "Begin" button is enabled. Edit those two lines if the dates
  change.

## Changing the passcode

Don't edit code for this — just change `ADMIN_PASSCODE` in Vercel's
environment variables and redeploy. Editing it in `.env.local` only
affects your local machine.
