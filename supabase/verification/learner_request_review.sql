-- Production verification after 202610090001_learner_request_review.sql.
select to_regprocedure('public.can_review_learning_requests(uuid)') as reviewer_authorization,
       to_regprocedure('public.skill_exchange_learner_request_queue()') as learner_queue,
       to_regprocedure('public.review_skill_exchange_learner_request(uuid,text,text)') as learner_decision,
       to_regprocedure('public.public_skill_learner_status(text)') as learner_status;

select status,count(*) from public.public_skill_learner_registrations group by status order by status;

select count(*) as invalid_final_decisions
from public.public_skill_learner_registrations
where status in ('approved','declined') and (reviewed_at is null or reviewed_by is null or reviewer_office is null);

select reference_number,status
from public.public_skill_learner_registrations
where reference_number='SXL-2026-C855BA4F82';

select kind,href,count(*) from public.skill_exchange_notifications
where learner_registration_id is not null group by kind,href order by kind,href;

select public.active_executive_office(m.auth_user_id) office,count(*) active_reviewers
from public."Members" m
where m.auth_user_id is not null and public.can_review_learning_requests(m.auth_user_id)
group by office order by office;
