create table public.worker_configuration (id text primary key, secret_hash text not null);
alter table public.worker_configuration enable row level security;
revoke all on public.worker_configuration from anon, authenticated;
grant select on public.worker_configuration to service_role;
create table public.generation_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default current_date, slot integer not null check(slot between 0 and 3),
 created_at timestamptz not null default now(), unique(user_id,day,slot)
);
alter table public.generation_attempts enable row level security;
revoke all on public.generation_attempts from anon, authenticated;
grant select,insert on public.generation_attempts to authenticated;
create policy attempts_read on public.generation_attempts for select to authenticated using((select auth.uid())=user_id);
create policy attempts_insert on public.generation_attempts for insert to authenticated with check((select auth.uid())=user_id and day=current_date);
