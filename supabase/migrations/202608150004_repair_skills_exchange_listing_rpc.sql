-- Load approved teacher profiles without depending on a PostgREST relationship
-- name or exposing the underlying moderation table to anonymous visitors.
create or replace function public.list_approved_member_teachers()
returns table (
  id uuid,
  subjects text,
  learner_levels text,
  languages text,
  availability text,
  teaching_format text,
  teacher_name text
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if not coalesce(public.is_active_member(), false) then
    raise exception 'Active membership is required'
      using errcode = '42501';
  end if;

  return query
  select
    teacher.id,
    teacher.subjects,
    teacher.learner_levels,
    teacher.languages,
    teacher.availability,
    teacher.teaching_format,
    coalesce(profile.full_name, 'Approved member teacher') as teacher_name
  from public.member_teacher_network as teacher
  left join public.profiles as profile
    on profile.id = teacher.member_id
  where teacher.status = 'approved'
  order by teacher.approved_at desc nulls last,
           teacher.created_at desc;
end;
$function$;

revoke all
on function public.list_approved_member_teachers()
from public;

grant execute
on function public.list_approved_member_teachers()
to authenticated;

comment on function public.list_approved_member_teachers() is
'Returns approved Skills Exchange teacher listings to active Association members without relying on PostgREST foreign-key embedding.';
