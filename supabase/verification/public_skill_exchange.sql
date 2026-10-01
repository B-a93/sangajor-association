-- Production verification after 202610010001_public_skill_exchange.sql.
-- All counts should be reviewed; invalid_final_decisions must be zero.
select public.can_review_skill_exchange(auth.uid()) as current_user_can_review;

select source, status, count(*) from (
  select 'member'::text source, status from public.skill_teaching_submissions
  union all
  select 'public', status from public.public_skill_teaching_applications
) requests group by source,status order by source,status;

select count(*) as public_pending_review
from public.public_skill_teaching_applications where status='pending';

select count(*) as invalid_final_decisions
from public.public_skill_teaching_applications
where status in ('approved','declined')
  and (reviewed_at is null or reviewed_by is null or nullif(btrim(decision_reason),'') is null);

select n.kind,n.href,count(*) from public.skill_exchange_notifications n
group by n.kind,n.href order by n.kind,n.href;
