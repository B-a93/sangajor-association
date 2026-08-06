-- Production repair: expose the zero-argument aggregate expected by the portal.
-- Members is the production member source of truth; profiles is intentionally unused.
-- Remove the retired parameterized overload so PostgREST cannot report an ambiguous
-- zero-argument call when its range_days parameter has a default.
drop function if exists public.executive_analytics(integer);

create or replace function public.executive_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  reporting_days constant integer := 30;
  since_date timestamptz := now() - make_interval(days => reporting_days);
begin
  if not public.can_view_executive_analytics(auth.uid()) then
    raise exception 'Not authorised to view executive analytics' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'rangeDays', reporting_days,
    'members', jsonb_build_object(
      'total', (select count(*) from public."Members" m where lower(coalesce(m.status, '')) = 'active'),
      'new', (select count(*) from public."Members" m where lower(coalesce(m.status, '')) = 'active' and m.created_at >= since_date)
    ),
    'finance', jsonb_build_object(
      'collected', coalesce((select sum(d.amount) from public.dues_payments d where d.paid_at >= since_date), 0),
      'payments', (select count(*) from public.dues_payments d where d.paid_at >= since_date)
    ),
    'engagement', jsonb_build_object(
      'eventResponses', (select count(*) from public.event_attendance e where e.updated_at >= since_date),
      'villagePosts', (select count(*) from public.village_posts v where v.created_at >= since_date),
      'volunteerApplications', (select count(*) from public.volunteer_applications v where v.created_at >= since_date),
      'announcementReads', (select count(*) from public.announcement_reads a where a.read_at >= since_date)
    ),
    'monthlyActivity', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'month', to_char(month_start, 'Mon YY'),
          'members', (select count(*) from public."Members" m where m.created_at >= month_start and m.created_at < month_start + interval '1 month'),
          'payments', (select count(*) from public.dues_payments d where d.paid_at >= month_start and d.paid_at < month_start + interval '1 month')
        ) order by month_start
      )
      from generate_series(
        date_trunc('month', now()) - interval '5 months',
        date_trunc('month', now()),
        interval '1 month'
      ) month_start
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.executive_analytics() from public;
revoke all on function public.executive_analytics() from anon;
grant execute on function public.executive_analytics() to authenticated;

comment on function public.executive_analytics() is
  'Executive-only production totals matching the Executive Analytics portal response contract.';
