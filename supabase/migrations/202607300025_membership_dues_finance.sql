-- Sprint 6: membership dues, receipts and auditable financial reporting.
create type public.dues_payment_method as enum ('cash', 'bank_transfer', 'mobile_money', 'other');

create table public.dues_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'GMD' check (currency ~ '^[A-Z]{3}$'),
  due_date date not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (name, due_date)
);

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.dues_periods(id),
  member_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null,
  payment_method public.dues_payment_method not null,
  reference text,
  note text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index dues_payments_member_idx on public.dues_payments (member_id, paid_at desc);
create index dues_payments_period_idx on public.dues_payments (period_id, paid_at desc);
create unique index dues_payments_reference_idx on public.dues_payments (reference)
  where reference is not null;

create or replace function public.can_manage_finances(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select is_active and role in
    ('treasurer', 'assistant_treasurer', 'auditor_general', 'chairman', 'admin')
    from public.profiles where id = user_id), false);
$$;

revoke all on function public.can_manage_finances(uuid) from public;
grant execute on function public.can_manage_finances(uuid) to authenticated;

create or replace function public.record_dues_payment(
  target_period_id uuid, target_member_id uuid, payment_amount numeric,
  payment_date timestamptz, method public.dues_payment_method,
  payment_reference text default null, payment_note text default null
) returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if not public.can_manage_finances() then
    raise exception 'Only authorized finance officers can record payments' using errcode = '42501';
  end if;
  if payment_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;
  if not exists (select 1 from public.dues_periods where id = target_period_id) then
    raise exception 'Dues period not found' using errcode = 'P0002';
  end if;
  insert into public.dues_payments
    (period_id, member_id, amount, paid_at, payment_method, reference, note, recorded_by)
  values (target_period_id, target_member_id, payment_amount, payment_date, method,
    nullif(trim(payment_reference), ''), nullif(trim(payment_note), ''), auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.record_dues_payment(uuid, uuid, numeric, timestamptz, public.dues_payment_method, text, text) from public;
grant execute on function public.record_dues_payment(uuid, uuid, numeric, timestamptz, public.dues_payment_method, text, text) to authenticated;

alter table public.dues_periods enable row level security;
alter table public.dues_payments enable row level security;
create policy "Active members can view dues periods" on public.dues_periods for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active));
create policy "Finance officers can create dues periods" on public.dues_periods for insert to authenticated
  with check (public.can_manage_finances() and created_by = auth.uid());
create policy "Finance officers can update dues periods" on public.dues_periods for update to authenticated
  using (public.can_manage_finances()) with check (public.can_manage_finances());
create policy "Members can view their own dues payments" on public.dues_payments for select to authenticated
  using (member_id = auth.uid());
create policy "Finance officers can view all dues payments" on public.dues_payments for select to authenticated
  using (public.can_manage_finances());
revoke insert, update, delete on public.dues_payments from authenticated, anon;

comment on table public.dues_payments is 'Immutable membership-dues receipts; corrections are retained through database administration rather than member-facing edits.';
