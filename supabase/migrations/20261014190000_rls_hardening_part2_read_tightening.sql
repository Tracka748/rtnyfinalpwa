-- RLS hardening part 2: read tightening
-- Applied by hand in the SQL editor on 2026-10-14. Mark with:
--   supabase migration repair --status applied 20261014190000
-- Never use `db push`.

begin;

-- partner_supporters: all app access is service-role
drop policy if exists supporters_public_read on public.partner_supporters;
drop policy if exists supporters_insert_own  on public.partner_supporters;
drop policy if exists supporters_delete_own  on public.partner_supporters;

-- vendors / vendor_services: public read removed; admin ALL policies stay
drop policy if exists "Public can view active vendors"          on public.vendors;
drop policy if exists "Public can view active vendor services"  on public.vendor_services;

-- promo_codes: remove "every active code" reads, add owner-only read
drop policy if exists "Public can view active promo codes"               on public.promo_codes;
drop policy if exists "Authenticated users can view active promo codes"  on public.promo_codes;

create policy promo_codes_select_own
  on public.promo_codes for select
  to authenticated
  using (created_by = (select auth.uid()));

commit;
