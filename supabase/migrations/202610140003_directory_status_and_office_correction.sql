-- Active directory rows are filtered by RLS using normalized status values.
-- Correct the authoritative executive titles for Omar Bah and Bakary Bojang.

begin;

update public."Members"
set role = 'assistant_treasurer', updated_at = now()
where lower(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) = 'bakary bojang';

update public."Members"
set role = 'chairman', updated_at = now()
where lower(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) = 'omar bah';

update public.executive_roles er
set office = 'assistant_treasurer',
    position = 'Assistant Treasurer'
from public."Members" m
where er.member_id = m.id
  and lower(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, ''))) = 'bakary bojang'
  and public.normalize_executive_office(er.office) = 'chairman';

update public.executive_roles er
set office = 'chairman',
    position = 'Chairman'
from public."Members" m
where er.member_id = m.id
  and lower(btrim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, ''))) = 'omar bah';

commit;
