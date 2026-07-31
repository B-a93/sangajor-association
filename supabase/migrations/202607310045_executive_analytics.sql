-- Sprint 13: privacy-preserving executive analytics and decision intelligence.
create or replace function public.can_view_executive_analytics(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and is_active
      and role in ('chairman', 'vice_chairperson', 'secretary_general', 'treasurer', 'auditor_general', 'admin')
  );
$$;

create or replace function public.executive_analytics(range_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  days integer := least(greatest(range_days, 7), 365);
  since_date timestamptz := now() - make_interval(days => least(greatest(range_days, 7), 365));
  result jsonb;
begin
  if not public.can_view_executive_analytics() then
    raise exception 'Not authorised to view executive analytics';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'rangeDays', days,
    'members', jsonb_build_object(
      'total', (select count(*) from public.profiles where is_active),
      'new', (select count(*) from public.profiles where is_active and created_at >= since_date)
    ),
    'finance', jsonb_build_object(
      'collected', coalesce((select sum(amount) from public.dues_payments where paid_at >= since_date), 0),
      'payments', (select count(*) from public.dues_payments where paid_at >= since_date)
    ),
    'engagement', jsonb_build_object(
      'eventResponses', (select count(*) from public.event_attendance where updated_at >= since_date),
      'villagePosts', (select count(*) from public.village_posts where created_at >= since_date),
      'volunteerApplications', (select count(*) from public.volunteer_applications where created_at >= since_date),
      'announcementReads', (select count(*) from public.announcement_reads where read_at >= since_date)
    ),
    'monthlyActivity', coalesce((
      select jsonb_agg(jsonb_build_object('month', month_label, 'members', members, 'payments', payments) order by month_start)
      from (
        select month_start, to_char(month_start, 'Mon YY') month_label,
          (select count(*) from public.profiles p where p.created_at >= month_start and p.created_at < month_start + interval '1 month') members,
          (select count(*) from public.dues_payments d where d.paid_at >= month_start and d.paid_at < month_start + interval '1 month') payments
        from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') month_start
      ) activity
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.can_view_executive_analytics(uuid) from public;
grant execute on function public.can_view_executive_analytics(uuid) to authenticated;
revoke all on function public.executive_analytics(integer) from public;
grant execute on function public.executive_analytics(integer) to authenticated;
comment on function public.executive_analytics is 'Aggregated, executive-only organisational health metrics; never exposes member-level data.';
