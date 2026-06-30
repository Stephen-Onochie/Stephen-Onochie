-- Public View: the owner-editable settings that drive what the public portfolio
-- shows (resume link/copy, Currently Reading visibility, social links). Defaults
-- reproduce the values that were previously hardcoded, so the public site looks
-- identical until the owner edits anything.
create table public.public_view_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  resume_url text not null default 'https://drive.google.com/file/d/1wwWW8jbMPgyqH5YyqObefPECvoomPn7N/view?usp=sharing',
  resume_heading text not null default 'Resume',
  resume_blurb text not null default 'Download a PDF overview of engineering experience, projects, and leadership.',
  show_currently_reading boolean not null default true,
  github_url text not null default 'https://github.com/Stephen-Onochie',
  linkedin_url text not null default 'https://linkedin.com/in/stephen-onochie-305760235',
  instagram_url text not null default 'https://www.instagram.com/stephenconochie/',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_view_settings enable row level security;

create policy "Users can manage their own public view settings"
  on public.public_view_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
