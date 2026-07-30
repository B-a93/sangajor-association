-- Sprint 8 follow-up: notification counters and bulk read acknowledgement.
create or replace function public.unread_announcement_count()
returns bigint language sql stable security definer set search_path = public
as $$
  select count(*) from public.announcements item
  where public.can_view_announcement(item)
    and not exists (select 1 from public.announcement_reads receipt
      where receipt.announcement_id = item.id and receipt.member_id = auth.uid());
$$;

create or replace function public.mark_all_announcements_read()
returns integer language plpgsql security definer set search_path = public
as $$
declare inserted_count integer;
begin
  insert into public.announcement_reads (announcement_id, member_id)
  select item.id, auth.uid() from public.announcements item
  where public.can_view_announcement(item)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.unread_announcement_count() from public;
grant execute on function public.unread_announcement_count() to authenticated;
revoke all on function public.mark_all_announcements_read() from public;
grant execute on function public.mark_all_announcements_read() to authenticated;

comment on function public.unread_announcement_count() is 'Returns the current member notification badge count.';
comment on function public.mark_all_announcements_read() is 'Acknowledges every announcement currently visible to the member.';
