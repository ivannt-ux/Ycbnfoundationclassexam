-- Run this once in Supabase → SQL Editor.
-- If you already created the table in an earlier attempt, see the
-- "already exists" note in README.md before re-running this.

create table exam_responses (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  name text not null,
  university text not null,
  phone text not null,
  email text not null,
  answers jsonb not null
);

alter table exam_responses enable row level security;

-- Anyone (the public exam form) can insert a response.
create policy "public can insert"
  on exam_responses for insert
  to anon
  with check (true);

-- No select policy is created for anon/authenticated — RLS blocks
-- reads by default. Only server-side code using the service role
-- key (in app/api/admin/responses/route.js) can read this table.
