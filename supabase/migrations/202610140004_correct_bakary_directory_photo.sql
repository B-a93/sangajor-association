-- Bakary Bojang is the Assistant Treasurer. His directory record was pointing
-- to the Chairman portrait, whose title is embedded in the image itself.

begin;

update public."Members"
set profile_photo = '/Bakary-Bojang-ASS-Treasurer Jul 28, 2026, 12_20_02 PM.png',
    role = 'assistant_treasurer',
    updated_at = now()
where lower(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) = 'bakary bojang';

commit;
