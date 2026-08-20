-- Give the IPRO and Secretariat offices access to public contact enquiries.
begin;

create or replace function public.can_manage_contact_enquiries(
  user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.office_has_permission(
    user_id,
    array[
      'ipro',
      'assistant_ipro',
      'secretary_general',
      'assistant_secretary_general'
    ]
  );
$function$;

revoke all
  on function public.can_manage_contact_enquiries(uuid)
  from public;

grant execute
  on function public.can_manage_contact_enquiries(uuid)
  to authenticated;

drop policy if exists "Authorized offices view contact enquiries"
  on public.contact_messages;

create policy "Authorized offices view contact enquiries"
  on public.contact_messages
  for select
  to authenticated
  using (
    public.can_manage_contact_enquiries(auth.uid())
  );

drop policy if exists "Authorized offices update contact enquiries"
  on public.contact_messages;

create policy "Authorized offices update contact enquiries"
  on public.contact_messages
  for update
  to authenticated
  using (
    public.can_manage_contact_enquiries(auth.uid())
  )
  with check (
    public.can_manage_contact_enquiries(auth.uid())
  );

grant select
  on table public.contact_messages
  to authenticated;

grant update (status, reviewed_at)
  on table public.contact_messages
  to authenticated;

create or replace function public.unread_contact_enquiry_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $function$
  select case
    when public.can_manage_contact_enquiries(auth.uid()) then (
      select count(*)
      from public.contact_messages enquiry
      where enquiry.status = 'new'
    )
    else 0::bigint
  end;
$function$;

revoke all
  on function public.unread_contact_enquiry_count()
  from public;

grant execute
  on function public.unread_contact_enquiry_count()
  to authenticated;

comment on function public.can_manage_contact_enquiries(uuid) is
  'Allows the active IPRO, Assistant IPRO, Secretary General and Assistant Secretary General offices to manage public enquiries.';

commit;
