begin;

create table if not exists public.membership_number_sequences (
  membership_year integer primary key,
  last_number integer not null default 0 check (last_number between 0 and 99999),
  updated_at timestamptz not null default now(),
  check (membership_year between 2000 and 9999)
);

alter table public.membership_number_sequences enable row level security;
revoke all on public.membership_number_sequences from anon, authenticated;

create or replace function public.generate_membership_number(
  target_year integer default extract(year from current_date)::integer
)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  highest_existing integer;
  next_number integer;
begin
  if target_year < 2000 or target_year > 9999 then
    raise exception 'Invalid membership year';
  end if;

  select coalesce(max(substring(membership_number from 10 for 5)::integer), 0)
    into highest_existing
  from public."Members"
  where membership_number ~ ('^SBC-' || target_year::text || '-[0-9]{5}$');

  insert into public.membership_number_sequences (membership_year, last_number, updated_at)
  values (target_year, highest_existing + 1, now())
  on conflict (membership_year) do update set
    last_number = greatest(public.membership_number_sequences.last_number + 1, highest_existing + 1),
    updated_at = now()
  returning last_number into next_number;

  if next_number > 99999 then
    raise exception 'Membership number capacity reached for year %', target_year;
  end if;
  return 'SBC-' || target_year::text || '-' || lpad(next_number::text, 5, '0');
end;
$function$;

revoke all on function public.generate_membership_number(integer) from public;

create or replace function public.assign_membership_number_on_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if nullif(btrim(new.membership_number), '') is null
     and new.auth_user_id is not null
     and lower(btrim(coalesce(new.status, ''))) = 'active'
     and (tg_op = 'INSERT' or old.auth_user_id is null or lower(btrim(coalesce(old.status, ''))) <> 'active')
  then
    new.membership_number := public.generate_membership_number(extract(year from current_date)::integer);
  end if;
  return new;
end;
$function$;

revoke all on function public.assign_membership_number_on_activation() from public;
drop trigger if exists members_assign_membership_number on public."Members";
create trigger members_assign_membership_number
before insert or update of auth_user_id, status on public."Members"
for each row execute function public.assign_membership_number_on_activation();

commit;
