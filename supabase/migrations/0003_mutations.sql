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
