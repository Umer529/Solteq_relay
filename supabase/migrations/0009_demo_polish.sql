alter table public.tasks
  add column due_date date;

alter table public.messages
  add column edited_at timestamptz;

drop function if exists public.create_task(
  uuid, text, text, public.task_priority, uuid, double precision, uuid
);
drop function if exists public.update_task(
  uuid, text, text, public.task_priority, uuid, uuid
);

create or replace function public.create_task(
  p_project_id uuid,
  p_title text,
  p_description text,
  p_priority public.task_priority,
  p_assignee_id uuid,
  p_due_date date,
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
    project_id, title, description, priority, assignee_id, due_date, position, created_by
  )
  values (
    p_project_id, p_title, p_description, p_priority, p_assignee_id, p_due_date, p_position, p_actor_id
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
      'assigneeName', assignee_name,
      'dueDate', p_due_date
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
  p_due_date date,
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
    assignee_id = p_assignee_id,
    due_date = p_due_date
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
      'assigneeName', assignee_name,
      'dueDate', changed_task.due_date
    )
  );

  return changed_task;
end;
$$;

create or replace function public.update_message(
  p_message_id uuid,
  p_body text,
  p_actor_id uuid
)
returns public.messages
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_message public.messages;
  changed_message public.messages;
  actor_name text;
begin
  select * into current_message from public.messages where id = p_message_id for update;
  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;
  if current_message.user_id <> p_actor_id then
    raise exception 'Only the author can edit this message' using errcode = '42501';
  end if;

  update public.messages
  set body = p_body, edited_at = now()
  where id = p_message_id
  returning * into changed_message;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    changed_message.project_id,
    p_actor_id,
    'message.updated',
    jsonb_build_object('messageId', changed_message.id, 'actorName', actor_name)
  );

  return changed_message;
end;
$$;

create or replace function public.delete_message(
  p_message_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  deleted_message public.messages;
  actor_name text;
begin
  select * into deleted_message from public.messages where id = p_message_id for update;
  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;

  select display_name into actor_name from public.profiles where id = p_actor_id;
  insert into public.activity_log (project_id, actor_id, type, payload)
  values (
    deleted_message.project_id,
    p_actor_id,
    'message.deleted',
    jsonb_build_object('messageId', deleted_message.id, 'actorName', actor_name)
  );

  delete from public.messages where id = p_message_id;
end;
$$;

revoke all on function public.create_task(
  uuid, text, text, public.task_priority, uuid, date, double precision, uuid
) from public, anon, authenticated;
revoke all on function public.update_task(
  uuid, text, text, public.task_priority, uuid, date, uuid
) from public, anon, authenticated;
revoke all on function public.update_message(uuid, text, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_message(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_task(
  uuid, text, text, public.task_priority, uuid, date, double precision, uuid
) to service_role;
grant execute on function public.update_task(
  uuid, text, text, public.task_priority, uuid, date, uuid
) to service_role;
grant execute on function public.update_message(uuid, text, uuid)
  to service_role;
grant execute on function public.delete_message(uuid, uuid)
  to service_role;
