-- Ensure the authorization helpers required by the practical-course RPCs are
-- available before those RPCs are created. "Members" is the authoritative
-- membership table; learning records use the linked Supabase Auth UUID.

do $create_learning_member_helper$
begin
  if to_regprocedure('public.is_active_learning_member(uuid)') is null then
    execute $function$
      create function public.is_active_learning_member(target_member_id uuid)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select coalesce(
          target_member_id is not null
          and exists (
            select 1
            from public."Members" member
            where member.auth_user_id = target_member_id
              and lower(btrim(coalesce(member.status, ''))) = 'active'
          ),
          false
        );
      $body$
    $function$;
  end if;
end
$create_learning_member_helper$;

revoke all on function public.is_active_learning_member(uuid) from public;
grant execute on function public.is_active_learning_member(uuid) to authenticated;

-- Fail before creating the practical-course RPCs if an earlier authorization
-- migration was omitted from a deployment.
do $verify_practical_course_helpers$
declare
  missing_helpers text[];
begin
  select array_agg(required_helper.signature order by required_helper.signature)
  into missing_helpers
  from (values
    ('public.is_active_learning_member(uuid)'),
    ('public.is_executive(uuid)'),
    ('public.active_executive_office(uuid)'),
    ('public.is_active_chairman(uuid)')
  ) as required_helper(signature)
  where to_regprocedure(required_helper.signature) is null;

  if missing_helpers is not null then
    raise exception 'Practical-course authorization helper(s) missing: %',
      array_to_string(missing_helpers, ', ');
  end if;
end
$verify_practical_course_helpers$;
