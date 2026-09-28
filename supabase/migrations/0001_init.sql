create extension if not exists pgcrypto;

create type public.project_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_color text not null default '#64748b',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index memberships_user_idx on public.memberships(user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_status_idx
  on public.tasks(project_id, status, position);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_project_created_idx
  on public.messages(project_id, created_at desc);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_project_created_idx
  on public.activity_log(project_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  palette constant text[] := array[
    '#54705f', '#6b6859', '#596b78', '#765f58', '#5f6578', '#657052'
  ];
  color_index integer;
begin
  color_index := (get_byte(decode(md5(new.id::text), 'hex'), 0) % array_length(palette, 1)) + 1;

  insert into public.profiles (id, email, display_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    palette[color_index]
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

create or replace function public.on_task_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'done' then
      new.completed_at := now();
    else
      new.completed_at := null;
      new.completed_by := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_status_change
  before update on public.tasks
  for each row execute procedure public.on_task_status_change();

create view public.project_progress with (security_invoker = true) as
select
  projects.id as project_id,
  count(tasks.*) as total,
  count(tasks.*) filter (where tasks.status = 'done') as done
from public.projects
left join public.tasks on tasks.project_id = projects.id
group by projects.id;

create view public.member_contributions with (security_invoker = true) as
select
  tasks.project_id,
  tasks.completed_by as user_id,
  count(*) as completed
from public.tasks
where tasks.status = 'done' and tasks.completed_by is not null
group by tasks.project_id, tasks.completed_by;
