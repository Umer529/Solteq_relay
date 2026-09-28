-- Relay database setup
-- Generated from supabase/migrations. Run once in a new Supabase project's SQL Editor.
-- Regenerate with: npm run db:bundle

-- -----------------------------------------------------------------------------
-- 0001_init.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 0002_rls.sql
-- -----------------------------------------------------------------------------

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships as actor_membership
    join public.memberships as target_membership
      on actor_membership.project_id = target_membership.project_id
    where actor_membership.user_id = auth.uid()
      and target_membership.user_id = p_user_id
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.shares_project_with(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.shares_project_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));

create policy projects_select
  on public.projects for select to authenticated
  using (public.is_project_member(id));

create policy memberships_select
  on public.memberships for select to authenticated
  using (public.is_project_member(project_id));

create policy tasks_select
  on public.tasks for select to authenticated
  using (public.is_project_member(project_id));

create policy messages_select
  on public.messages for select to authenticated
  using (public.is_project_member(project_id));

create policy activity_select
  on public.activity_log for select to authenticated
  using (public.is_project_member(project_id));

grant select on public.profiles to authenticated;
grant select on public.projects to authenticated;
grant select on public.memberships to authenticated;
grant select on public.tasks to authenticated;
grant select on public.messages to authenticated;
grant select on public.activity_log to authenticated;
grant select on public.project_progress to authenticated;
grant select on public.member_contributions to authenticated;

grant all on public.profiles to service_role;
grant all on public.projects to service_role;
grant all on public.memberships to service_role;
grant all on public.tasks to service_role;
grant all on public.messages to service_role;
grant all on public.activity_log to service_role;
grant select on public.project_progress to service_role;
grant select on public.member_contributions to service_role;

-- -----------------------------------------------------------------------------
-- 0003_mutations.sql
-- -----------------------------------------------------------------------------

create or replace function public.create_project(
  p_name text,
  p_description text,
  p_actor_id uuid
)
returns public.projects
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_project public.projects;
  actor_name text;
begin
  select display_name into actor_name
  from public.profiles
  where id = p_actor_id;

  if actor_name is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.projects (name, description, created_by)
  values (p_name, p_description, p_actor_id)
  returning * into created_project;

  insert into public.memberships (project_id, user_id, role)
  values (created_project.id, p_actor_id, 'owner');

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    created_project.id,
    p_actor_id,
    'project.created',
    jsonb_build_object('projectName', created_project.name, 'actorName', actor_name)
  );

  return created_project;
end;
$$;

create or replace function public.change_task_status(
  p_task_id uuid,
  p_status public.task_status,
  p_position double precision,
  p_actor_id uuid
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_task public.tasks;
  changed_task public.tasks;
  actor_name text;
begin
  select * into old_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;

  update public.tasks
  set
    status = p_status,
    position = p_position,
    completed_by = case when p_status = 'done' then p_actor_id else null end
  where id = p_task_id
  returning * into changed_task;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    changed_task.project_id,
    p_actor_id,
    'task.status_changed',
    jsonb_build_object(
      'taskId', changed_task.id,
      'title', changed_task.title,
      'from', old_task.status,
      'to', changed_task.status,
      'actorName', actor_name
    )
  );

  return changed_task;
end;
$$;

create or replace function public.change_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_role,
  p_actor_id uuid
)
returns public.memberships
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_membership public.memberships;
  changed_membership public.memberships;
  owner_count integer;
  actor_name text;
  target_name text;
begin
  select * into old_membership
  from public.memberships
  where project_id = p_project_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if old_membership.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count
    from public.memberships
    where project_id = p_project_id and role = 'owner';

    if owner_count <= 1 then
      raise exception 'A project must always have at least one owner'
        using errcode = '23514';
    end if;
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into target_name from public.profiles where id = p_user_id;

  update public.memberships
  set role = p_role
  where project_id = p_project_id and user_id = p_user_id
  returning * into changed_membership;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'member.role_changed',
    jsonb_build_object(
      'userId', p_user_id,
      'targetName', target_name,
      'actorName', actor_name,
      'from', old_membership.role,
      'to', changed_membership.role
    )
  );

  return changed_membership;
end;
$$;

revoke all on function public.create_project(text, text, uuid) from public, anon, authenticated;
revoke all on function public.change_task_status(uuid, public.task_status, double precision, uuid) from public, anon, authenticated;
revoke all on function public.change_member_role(uuid, uuid, public.project_role, uuid) from public, anon, authenticated;

grant execute on function public.create_project(text, text, uuid) to service_role;
grant execute on function public.change_task_status(uuid, public.task_status, double precision, uuid) to service_role;
grant execute on function public.change_member_role(uuid, uuid, public.project_role, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 0004_realtime.sql
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.tasks,
  public.memberships,
  public.messages,
  public.activity_log;

alter table public.tasks replica identity full;
alter table public.memberships replica identity full;

-- -----------------------------------------------------------------------------
-- 0005_projects_members.sql
-- -----------------------------------------------------------------------------

create or replace function public.update_project(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_actor_id uuid
)
returns public.projects
language plpgsql
security invoker
set search_path = public
as $$
declare
  changed_project public.projects;
  actor_name text;
begin
  select display_name into actor_name from public.profiles where id = p_actor_id;

  update public.projects
  set name = p_name, description = p_description
  where id = p_project_id
  returning * into changed_project;

  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'project.updated',
    jsonb_build_object('projectName', changed_project.name, 'actorName', actor_name)
  );

  return changed_project;
end;
$$;

create or replace function public.delete_project(
  p_project_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  project_name text;
  actor_name text;
begin
  select name into project_name from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'project.deleted',
    jsonb_build_object('projectName', project_name, 'actorName', actor_name)
  );

  delete from public.projects where id = p_project_id;
end;
$$;

create or replace function public.add_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_role,
  p_actor_id uuid
)
returns public.memberships
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_membership public.memberships;
  actor_name text;
  target_name text;
begin
  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into target_name from public.profiles where id = p_user_id;
  if target_name is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.memberships (project_id, user_id, role)
  values (p_project_id, p_user_id, p_role)
  returning * into created_membership;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'member.joined',
    jsonb_build_object(
      'userId', p_user_id,
      'targetName', target_name,
      'actorName', actor_name,
      'role', p_role
    )
  );

  return created_membership;
end;
$$;

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_role public.project_role;
  owner_count integer;
  actor_name text;
  target_name text;
begin
  perform 1 from public.projects where id = p_project_id for update;

  select role into target_role
  from public.memberships
  where project_id = p_project_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if target_role = 'owner' then
    select count(*) into owner_count
    from public.memberships
    where project_id = p_project_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'A project must always have at least one owner'
        using errcode = '23514';
    end if;
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into target_name from public.profiles where id = p_user_id;

  delete from public.memberships
  where project_id = p_project_id and user_id = p_user_id;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'member.removed',
    jsonb_build_object(
      'userId', p_user_id,
      'targetName', target_name,
      'actorName', actor_name,
      'role', target_role
    )
  );
end;
$$;

create or replace function public.change_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_role,
  p_actor_id uuid
)
returns public.memberships
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_membership public.memberships;
  changed_membership public.memberships;
  owner_count integer;
  actor_name text;
  target_name text;
begin
  perform 1 from public.projects where id = p_project_id for update;

  select * into old_membership
  from public.memberships
  where project_id = p_project_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if old_membership.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count
    from public.memberships
    where project_id = p_project_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'A project must always have at least one owner'
        using errcode = '23514';
    end if;
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into target_name from public.profiles where id = p_user_id;

  update public.memberships
  set role = p_role
  where project_id = p_project_id and user_id = p_user_id
  returning * into changed_membership;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'member.role_changed',
    jsonb_build_object(
      'userId', p_user_id,
      'targetName', target_name,
      'actorName', actor_name,
      'from', old_membership.role,
      'to', changed_membership.role
    )
  );

  return changed_membership;
end;
$$;

revoke all on function public.update_project(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.delete_project(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_project_member(uuid, uuid, public.project_role, uuid) from public, anon, authenticated;
revoke all on function public.remove_project_member(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.change_member_role(uuid, uuid, public.project_role, uuid) from public, anon, authenticated;

grant execute on function public.update_project(uuid, text, text, uuid) to service_role;
grant execute on function public.delete_project(uuid, uuid) to service_role;
grant execute on function public.add_project_member(uuid, uuid, public.project_role, uuid) to service_role;
grant execute on function public.remove_project_member(uuid, uuid, uuid) to service_role;
grant execute on function public.change_member_role(uuid, uuid, public.project_role, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 0006_tasks.sql
-- -----------------------------------------------------------------------------

create or replace function public.create_task(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_priority public.task_priority,
  p_assignee_id uuid,
  p_position double precision,
  p_actor_id uuid
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_task public.tasks;
  actor_name text;
  assignee_name text;
begin
  if p_assignee_id is not null and not exists (
    select 1 from public.memberships
    where project_id = p_project_id and user_id = p_assignee_id
  ) then
    raise exception 'Assignee must be a project member' using errcode = '23514';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into assignee_name from public.profiles where id = p_assignee_id;

  insert into public.tasks (
    project_id, title, description, priority, assignee_id, position, created_by
  )
  values (
    p_project_id, p_title, p_description, p_priority, p_assignee_id, p_position, p_actor_id
  )
  returning * into created_task;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'task.created',
    jsonb_build_object(
      'taskId', created_task.id,
      'title', created_task.title,
      'actorName', actor_name,
      'assigneeId', p_assignee_id,
      'assigneeName', assignee_name
    )
  );

  return created_task;
end;
$$;

create or replace function public.update_task(
  p_task_id uuid,
  p_title text,
  p_description text,
  p_priority public.task_priority,
  p_assignee_id uuid,
  p_actor_id uuid
)
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_task public.tasks;
  changed_task public.tasks;
  actor_name text;
  assignee_name text;
  event_type text;
begin
  select * into old_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if p_assignee_id is not null and not exists (
    select 1 from public.memberships
    where project_id = old_task.project_id and user_id = p_assignee_id
  ) then
    raise exception 'Assignee must be a project member' using errcode = '23514';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  select display_name into assignee_name from public.profiles where id = p_assignee_id;

  update public.tasks
  set
    title = p_title,
    description = p_description,
    priority = p_priority,
    assignee_id = p_assignee_id
  where id = p_task_id
  returning * into changed_task;

  event_type := case
    when old_task.assignee_id is distinct from changed_task.assignee_id then 'task.assigned'
    else 'task.updated'
  end;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    changed_task.project_id,
    p_actor_id,
    event_type,
    jsonb_build_object(
      'taskId', changed_task.id,
      'title', changed_task.title,
      'actorName', actor_name,
      'assigneeId', changed_task.assignee_id,
      'assigneeName', assignee_name
    )
  );

  return changed_task;
end;
$$;

create or replace function public.delete_task(
  p_task_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_task public.tasks;
  actor_name text;
begin
  select * into deleted_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    deleted_task.project_id,
    p_actor_id,
    'task.deleted',
    jsonb_build_object(
      'taskId', deleted_task.id,
      'title', deleted_task.title,
      'actorName', actor_name
    )
  );

  delete from public.tasks where id = p_task_id;
end;
$$;

revoke all on function public.create_task(uuid, text, text, public.task_priority, uuid, double precision, uuid)
  from public, anon, authenticated;
revoke all on function public.update_task(uuid, text, text, public.task_priority, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_task(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_task(uuid, text, text, public.task_priority, uuid, double precision, uuid)
  to service_role;
grant execute on function public.update_task(uuid, text, text, public.task_priority, uuid, uuid)
  to service_role;
grant execute on function public.delete_task(uuid, uuid)
  to service_role;

-- -----------------------------------------------------------------------------
-- 0007_messages.sql
-- -----------------------------------------------------------------------------

create or replace function public.post_message(
  p_project_id uuid,
  p_body text,
  p_actor_id uuid
)
returns public.messages
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_message public.messages;
  actor_name text;
begin
  select display_name into actor_name from public.profiles where id = p_actor_id;

  insert into public.messages (project_id, user_id, body)
  values (p_project_id, p_actor_id, p_body)
  returning * into created_message;

  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    p_project_id,
    p_actor_id,
    'message.posted',
    jsonb_build_object(
      'messageId', created_message.id,
      'actorName', actor_name
    )
  );

  return created_message;
end;
$$;

revoke all on function public.post_message(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.post_message(uuid, text, uuid)
  to service_role;

-- -----------------------------------------------------------------------------
-- 0008_realtime_authorization.sql
-- -----------------------------------------------------------------------------

-- Authorize project-scoped Presence and Broadcast channels. The web client
-- opts into a private channel, so these policies are evaluated on join.
create policy "project members can receive project realtime"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select realtime.topic()) ~ '^project:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}:presence$'
  and public.is_project_member(
    split_part((select realtime.topic()), ':', 2)::uuid
  )
);

create policy "project members can send project realtime"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and (select realtime.topic()) ~ '^project:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}:presence$'
  and public.is_project_member(
    split_part((select realtime.topic()), ':', 2)::uuid
  )
);
