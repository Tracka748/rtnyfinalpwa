import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return letters.toUpperCase();
}

function PickerHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div>
            <p className="text-base font-header font-bold text-white leading-none">Partner Hub</p>
            <p className="font-label text-[10px] tracking-widest text-[#1AC8ED] uppercase mt-1">
              RocTicketNY
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium text-[#7DD8E8] hover:bg-white/10 hover:text-[#007BFF] transition-colors"
        >
          <span>←</span>
          <span>Back to Site</span>
        </Link>
      </div>
    </header>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#121113]">
      <PickerHeader />
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="text-5xl mb-4 block">🏪</span>
        <h1 className="text-xl font-header font-bold text-white mb-2">{title}</h1>
        <p className="text-[#7DD8E8] text-sm mb-6">{body}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
        >
          Back to Site
        </Link>
      </main>
    </div>
  );
}

export default async function PartnerPickerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const db = createSupabaseAdmin();

  const { data: partners, error: partnersError } = await db
    .from('partners')
    .select('id, display_name, category, active, business_id, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (partnersError) {
    console.error('partner picker: partners query failed', partnersError);
    return (
      <Message
        title="We couldn’t load your businesses"
        body="Something went wrong. Please try again in a moment."
      />
    );
  }

  const owned = partners ?? [];

  if (owned.length === 0) {
    return (
      <Message
        title="No business linked to your account yet"
        body="Once a business is linked to your account, it will show up here."
      />
    );
  }

  if (owned.length === 1) {
    redirect(`/partner/${owned[0].id}/dashboard`);
  }

  const businessIds = [...new Set(owned.map((p) => p.business_id).filter((id): id is string => !!id))];

  const { data: businesses, error: businessesError } = businessIds.length > 0
    ? await db
        .from('businesses')
        .select('id, name, category, is_active')
        .in('id', businessIds)
    : { data: [], error: null };

  if (businessesError) {
    console.error('partner picker: businesses query failed', businessesError);
  }

  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));

  const cards = owned.map((p) => {
    const business = p.business_id ? businessById.get(p.business_id) : undefined;
    const name: string = business?.name ?? p.display_name;
    const category: string | null = business?.category ?? p.category ?? null;
    const isActive: boolean = business?.is_active ?? p.active;
    return { id: p.id as string, name, category, isActive };
  });

  return (
    <div className="min-h-screen bg-[#121113]">
      <PickerHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-header font-bold text-white mb-2">
          Choose a <span className="text-[#59FFA0]">business</span>
        </h1>
        <p className="text-[#7DD8E8] text-sm mb-8">
          Your account manages {cards.length} businesses. Pick one to open its dashboard.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col gap-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#59FFA0] to-[#1AC8ED] text-lg font-bold text-[#121113]">
                  {initials(card.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-header font-bold text-white truncate">{card.name}</p>
                  {card.category && (
                    <p className="text-xs text-[#7DD8E8] mt-0.5 truncate">{card.category}</p>
                  )}
                </div>
                <span
                  className={`inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    card.isActive
                      ? 'bg-green-500/20 text-green-300 border-green-500/30'
                      : 'bg-white/10 text-white/50 border-white/20'
                  }`}
                >
                  {card.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <Link
                href={`/partner/${card.id}/dashboard`}
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-[#59FFA0] text-black font-semibold text-sm hover:bg-[#59FFA0]/90 transition-colors"
              >
                Open dashboard
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
