-- Executive invitations carry an explicit, allow-listed office assignment.
alter table public.invitations add column if not exists executive_office text;
alter table public.invitations add column if not exists executive_position text;
alter table public.executive_roles add column if not exists position text;

alter table public.invitations drop constraint if exists invitations_executive_assignment_complete;
alter table public.invitations add constraint invitations_executive_assignment_complete check (
  (executive_office is null and executive_position is null) or
  (executive_office in ('chairman','vice_chairlady','secretary_general','assistant_secretary_general',
    'treasurer','assistant_treasurer','auditor_general','assistant_auditor_general','assistant_auditor',
    'ipro','assistant_ipro','programme_officer','assistant_programme_officer',
    'adviser_1','adviser_2','adviser_3','adviser_4') and nullif(btrim(executive_position), '') is not null)
) not valid;

comment on column public.invitations.executive_office is 'Allow-listed machine office assigned only after acceptance; null denotes an ordinary member invitation.';
comment on column public.invitations.executive_position is 'Human-readable executive position paired with executive_office.';
comment on column public.executive_roles.position is 'Human-readable title assigned by an accepted executive invitation.';
