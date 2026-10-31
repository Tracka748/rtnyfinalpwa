-- Fix: flyer uploads by app-approved promoters were rejected by storage RLS, which also
-- required the legacy users.is_promoter flag. Already applied live on 2026-10-29.
drop policy if exists "Promoters can upload flyers" on storage.objects;

create policy "Promoters can upload flyers"
on storage.objects
for insert
to public
with check (
  bucket_id = 'event-flyers'
  and (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and (p.role in ('promoter', 'admin') or p.is_organizer = true)
    )
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.is_promoter = true
    )
  )
);
