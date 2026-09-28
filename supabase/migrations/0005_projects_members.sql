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
