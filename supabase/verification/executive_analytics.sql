-- Run after applying migrations. A non-null result confirms PostgREST can discover
-- the exact zero-argument overload used by the Executive Analytics portal.
select to_regprocedure('public.executive_analytics()');
