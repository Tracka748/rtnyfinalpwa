-- Rollback for supabase/migrations/20261014190000_rls_hardening_part2_read_tightening.sql
-- Kept OUTSIDE supabase/migrations/ on purpose: the CLI would otherwise read
-- "<timestamp>_<name>.rollback.sql" as a second migration with a duplicate version.
-- Run by hand in the SQL editor. Never use `db push`.
--
-- Re-opens public reads of vendors/vendor_services/partner_supporters and the
-- "every active promo code" reads on promo_codes.

begin;
drop policy if exists promo_codes_select_own on public.promo_codes;

create policy "Public can view active promo codes" on public.promo_codes
  for select to public
  using ((active = true) and ((valid_until is null) or (valid_until > now())));
create policy "Authenticated users can view active promo codes" on public.promo_codes
  for select to authenticated using (active = true);

create policy "Public can view active vendors" on public.vendors
  for select to public using (active = true);
create policy "Public can view active vendor services" on public.vendor_services
  for select to public using (active = true);

create policy supporters_public_read on public.partner_supporters
  for select to public using (true);
create policy supporters_delete_own on public.partner_supporters
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy supporters_insert_own on public.partner_supporters
  for insert to authenticated with check ((select auth.uid()) = user_id);
commit;
