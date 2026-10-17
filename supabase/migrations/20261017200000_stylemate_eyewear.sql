-- StyleMate: glasses get their own category. sub_type is 'glasses' (clear lenses)
-- or 'sunglasses'; all of the owner's eyewear is prescription.
alter type public.apparel_category add value if not exists 'eyewear';
