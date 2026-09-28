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
