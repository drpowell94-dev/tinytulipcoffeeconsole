-- Shared-workspace sync: one key/value row per localStorage collection so the
-- whole team reads/writes the same data. No auth — anon role gets full access.

create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Realtime UPDATE payloads should carry the full new row.
alter table public.app_state replica identity full;

alter table public.app_state enable row level security;

-- The whole team shares one dataset, so allow the anon/public role full
-- read+write. (Intentional trade-off for a small internal tool.)
drop policy if exists "app_state shared access" on public.app_state;
create policy "app_state shared access" on public.app_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Stream changes to all connected clients.
alter publication supabase_realtime add table public.app_state;
