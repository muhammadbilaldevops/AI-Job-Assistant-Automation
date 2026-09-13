create table public.user_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null, data jsonb not null, status text not null default 'Saved',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,source_key), unique(id,user_id)
);
create table public.automation_runs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 state text not null default 'STARTING' check (state in ('IDLE','STARTING','SEARCHING','ANALYZING','RESEARCHING_COMPANY','MATCHING','SAVING_JOBS','GENERATING_RESUME','GENERATING_COVER_LETTER','COMPLETED','FAILED','PAUSED')),
 data jsonb not null default '{}', lease_until timestamptz not null default '1970-01-01',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_search_per_user on public.automation_runs(user_id) where state not in ('COMPLETED','FAILED','PAUSED');
create table public.generated_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid, kind text not null check(kind in ('resume','coverLetter')), data jsonb not null,
 created_at timestamptz not null default now(), foreign key(job_id,user_id) references public.jobs(id,user_id) on delete cascade
);
create table public.resumes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null, created_at timestamptz not null default now()
);
create table public.company_research (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null, data jsonb not null, created_at timestamptz not null default now(),
 unique(user_id,job_id), foreign key(job_id,user_id) references public.jobs(id,user_id) on delete cascade
);
create table public.job_analysis (like public.company_research including all);
alter table public.job_analysis add foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.job_analysis add foreign key(job_id,user_id) references public.jobs(id,user_id) on delete cascade;
create table public.job_matches (like public.company_research including all);
alter table public.job_matches add foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.job_matches add foreign key(job_id,user_id) references public.jobs(id,user_id) on delete cascade;
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null, created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['user_profiles','jobs','automation_runs','generated_documents','resumes','company_research','job_analysis','job_matches','notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)',t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',t);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',t);
  execute format('create index on public.%I(user_id)',t);
 end loop;
end $$;
create index jobs_recent on public.jobs(user_id,created_at desc);
create index runs_recent on public.automation_runs(user_id,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('career-originals','career-originals',false,3145728,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain']);
create policy original_select on storage.objects for select to authenticated using (bucket_id='career-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy original_insert on storage.objects for insert to authenticated with check (bucket_id='career-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy original_delete on storage.objects for delete to authenticated using (bucket_id='career-originals' and (storage.foldername(name))[1]=(select auth.uid())::text);
