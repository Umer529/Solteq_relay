alter publication supabase_realtime add table
  public.tasks,
  public.memberships,
  public.messages,
  public.activity_log;

alter table public.tasks replica identity full;
alter table public.memberships replica identity full;
