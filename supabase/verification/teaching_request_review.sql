-- Production verification: run after 202608200001_teaching_request_review.sql.
-- The first result identifies any historical decisions that pre-date the new
-- reason/audit fields; investigate them without deleting or rewriting history.
select count(*) as historical_decisions_needing_audit
from public.skill_teaching_submissions
where (status = 'declined' and nullif(btrim(decline_reason), '') is null)
   or (status <> 'pending' and (reviewed_at is null or reviewed_by is null));

select m.id as chairman_member_id, m.auth_user_id, m.first_name, m.last_name,
       public.active_executive_office(m.auth_user_id) as active_office
from public."Members" m
where public.active_executive_office(m.auth_user_id) = 'chairman';

select status, count(*) as request_count from public.skill_teaching_submissions
group by status order by status;

select count(*) as pending_requests from public.skill_teaching_submissions where status = 'pending';

select n.request_id, n.recipient_id, n.href, n.created_at, n.read_at
from public.teaching_request_notifications n
join public.skill_teaching_submissions r on r.id = n.request_id
order by n.created_at desc limit 20;
