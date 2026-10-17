-- StyleMate: second outfit image, the look worn by a faceless model.
alter table public.stylemate_outfits
  add column model_image_path text,
  add column model_image_status text not null default 'none'
    check (model_image_status in ('none', 'pending', 'done', 'failed'));
