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
