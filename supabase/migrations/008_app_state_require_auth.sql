-- Close the anon access opened in 007: the app now gates itself behind a
-- shared team passcode (one Supabase Auth account, see useAuth.ts), so
-- app_state should only be reachable with a real session, not the public
-- anon key alone.

drop policy if exists "app_state shared access" on public.app_state;
create policy "app_state shared access" on public.app_state
  for all
  to authenticated
  using (true)
  with check (true);
