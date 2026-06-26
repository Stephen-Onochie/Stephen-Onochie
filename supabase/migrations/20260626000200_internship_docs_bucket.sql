-- Private storage bucket for internship documents (resumes, cover letters).
-- Owner-scoped: files live under a `${user_id}/…` prefix and policies restrict
-- access to the owning user.

insert into storage.buckets (id, name, public)
values ('internship-docs', 'internship-docs', false)
on conflict (id) do nothing;

create policy "Users manage their own internship docs - select"
  on storage.objects for select
  using (
    bucket_id = 'internship-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users manage their own internship docs - insert"
  on storage.objects for insert
  with check (
    bucket_id = 'internship-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users manage their own internship docs - delete"
  on storage.objects for delete
  using (
    bucket_id = 'internship-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
