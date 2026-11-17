-- Self-hosted résumé served at stephenonochie.com/resume. The owner drops a
-- .pdf or .docx in Site Settings; the server stores the PDF (converting .docx)
-- at site-files/<uid>/resume.pdf and records it here.
alter table public.public_view_settings
  add column if not exists resume_file_path text,
  add column if not exists resume_file_name text,
  add column if not exists resume_file_size integer,
  add column if not exists resume_uploaded_at timestamptz;

-- Private bucket: the public only ever reaches the file through /resume, which
-- reads it with the service role. The owner uploads raw drops into
-- <uid>/uploads/ before the server processes them.
insert into storage.buckets (id, name, public)
values ('site-files', 'site-files', false)
on conflict (id) do nothing;

create policy "Owner uploads site files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owner reads site files"
  on storage.objects for select to authenticated
  using (bucket_id = 'site-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Owner deletes site files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-files' and (storage.foldername(name))[1] = auth.uid()::text);
