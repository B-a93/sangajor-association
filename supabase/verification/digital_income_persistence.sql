-- Run while impersonating the affected authenticated user in the Supabase SQL
-- editor, or replace auth.uid() below with that user's Auth UUID.
select auth.uid() as authenticated_user_id,
       m.id as member_record_id,
       m.auth_user_id,
       m.status,
       lower(btrim(coalesce(m.status, ''))) = 'active' as active_link
from public."Members" m
where m.auth_user_id = auth.uid();

select member_id, lesson_slug, knowledge_score, knowledge_submitted, completed_at, updated_at
from public.lesson_progress
where member_id = auth.uid()
  and lesson_slug = 'digital-income-lesson-1'
  and knowledge_score = 100
  and knowledge_submitted = true
  and completed_at is not null;
