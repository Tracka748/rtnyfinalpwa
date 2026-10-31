-- Fix: promoters approved through the app (profiles.role / promoters table) could not
-- create event drafts, because the insert policy required users.is_promoter = true,
-- a legacy flag nothing sets anymore. Now accepts the roles the app uses, and keeps the
-- legacy path. Already applied live on 2026-10-29; this file records it.
drop policy if exists "Promoters can create drafts" on public.event_drafts;

create policy "Promoters can create drafts"
on public.event_drafts
for insert
to public
with check (
  auth.uid() = promoter_id
  and (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role in ('promoter', 'admin') or p.is_organizer = true)
    )
    or exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_promoter = true
    )
  )
);
