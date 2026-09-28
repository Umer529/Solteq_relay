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
