-- Sprint 9: secure Association documents and knowledge centre.
create type public.document_category as enum ('meeting_minutes', 'policy', 'report', 'form', 'resource');
create type public.document_audience as enum ('all_members', 'executives');
create type public.document_status as enum ('draft', 'published', 'archived');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text check (description is null or char_length(description) <= 1000),
  category public.document_category not null,
  audience public.document_audience not null default 'all_members',
  status public.document_status not null default 'draft',
  document_key text not null check (char_length(trim(document_key)) between 1 and 100),
  version integer not null default 1 check (version > 0),
  file_path text not null unique,
  file_name text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  mime_type text not null,
  meeting_date date,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_key, version),
  check ((status = 'draft' and published_at is null) or (status <> 'draft' and published_at is not null))
);

create index documents_library_idx on public.documents (status, category, published_at desc);
create index documents_versions_idx on public.documents (document_key, version desc);
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

create or replace function public.can_manage_documents(user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_active and role in ('secretary_general', 'assistant_secretary_general', 'chairman', 'admin') from public.profiles where id = user_id), false); $$;

create or replace function public.can_view_document(item public.documents, user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_active and item.status = 'published' and (item.audience = 'all_members' or role <> 'member') from public.profiles where id = user_id), false); $$;

create or replace function public.set_document_status(target_document_id uuid, new_status public.document_status)
returns void language plpgsql security definer set search_path = public as $$
declare target public.documents%rowtype;
begin
  if not public.can_manage_documents() then raise exception 'Only authorized officers can publish documents' using errcode = '42501'; end if;
  if new_status = 'draft' then raise exception 'Published documents cannot return to draft'; end if;
  select * into target from public.documents where id = target_document_id for update;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  if new_status = 'published' then
    update public.documents set status = 'archived' where document_key = target.document_key and status = 'published' and id <> target.id;
  end if;
  update public.documents set status = new_status, published_at = coalesce(published_at, now()) where id = target_document_id;
end; $$;

revoke all on function public.can_manage_documents(uuid) from public;
grant execute on function public.can_manage_documents(uuid) to authenticated;
revoke all on function public.can_view_document(public.documents, uuid) from public;
grant execute on function public.can_view_document(public.documents, uuid) to authenticated;
revoke all on function public.set_document_status(uuid, public.document_status) from public;
grant execute on function public.set_document_status(uuid, public.document_status) to authenticated;

alter table public.documents enable row level security;
create policy "Members can view published documents" on public.documents for select to authenticated using (public.can_view_document(documents.*) or public.can_manage_documents());
create policy "Document officers can create drafts" on public.documents for insert to authenticated with check (public.can_manage_documents() and created_by = auth.uid() and status = 'draft');
create policy "Document officers can update documents" on public.documents for update to authenticated using (public.can_manage_documents()) with check (public.can_manage_documents());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (
  'association-documents', 'association-documents', false, 52428800,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain']
);
create policy "Officers can upload document files" on storage.objects for insert to authenticated with check (bucket_id = 'association-documents' and public.can_manage_documents());
create policy "Officers can remove document files" on storage.objects for delete to authenticated using (bucket_id = 'association-documents' and public.can_manage_documents());
create policy "Authorized members can download document files" on storage.objects for select to authenticated using (
  bucket_id = 'association-documents' and exists (select 1 from public.documents item where item.file_path = name and (public.can_view_document(item) or public.can_manage_documents()))
);

comment on table public.documents is 'Versioned, audience-controlled Association documents and meeting minutes.';
