import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// promoters columns confirmed: id, user_id, business_name, instagram_handle, contact_email, phone, website, description
// display_name and bio may be newer columns — upsert/update will surface a DB error if they don't exist yet

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch both rows in parallel
    const [promoterResult, profileResult] = await Promise.all([
      supabase
        .from('promoters')
        .select('id, display_name, business_name, instagram_handle, bio, website, contact_email, status')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('first_name, last_name, email, bio, phone, role, created_at')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (promoterResult.error) {
      console.error('[promoter/profile] GET promoters error:', promoterResult.error);
    }
    if (profileResult.error) {
      console.error('[promoter/profile] GET profiles error:', profileResult.error);
    }

    // Merge: promoter fields take priority over profile fields for shared keys (bio)
    const merged = {
      // from profiles
      first_name: profileResult.data?.first_name ?? null,
      last_name: profileResult.data?.last_name ?? null,
      email: profileResult.data?.email ?? user.email ?? null,
      phone: profileResult.data?.phone ?? null,
      // from promoters (bio prefers promoters.bio, falls back to profiles.bio)
      display_name: promoterResult.data?.display_name ?? null,
      business_name: promoterResult.data?.business_name ?? null,
      instagram_handle: promoterResult.data?.instagram_handle ?? null,
      bio: promoterResult.data?.bio ?? profileResult.data?.bio ?? null,
      website: promoterResult.data?.website ?? null,
      contact_email: promoterResult.data?.contact_email ?? null,
      // account info (read-only)
      role: profileResult.data?.role ?? null,
      member_since: profileResult.data?.created_at ?? null,
      promoter_status: promoterResult.data?.status ?? null,
      promoter_id: promoterResult.data?.id ?? null,
    };

    return NextResponse.json({ success: true, data: merged });
  } catch (err) {
    console.error('[promoter/profile] GET unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Strip to allowed fields only
    const promoterFields: Record<string, unknown> = {};
    if (body.display_name !== undefined) promoterFields.display_name = body.display_name || null;
    if (body.instagram_handle !== undefined) promoterFields.instagram_handle = body.instagram_handle || null;
    if (body.bio !== undefined) promoterFields.bio = body.bio || null;

    const profileFields: Record<string, unknown> = {};
    if (body.first_name !== undefined) profileFields.first_name = body.first_name || null;
    if (body.last_name !== undefined) profileFields.last_name = body.last_name || null;
    if (body.phone !== undefined) profileFields.phone = body.phone || null;

    const updates: Promise<{ error: unknown }>[] = [];

    // Upsert promoters row using user_id as the conflict key
    if (Object.keys(promoterFields).length > 0) {
      updates.push(
        supabase
          .from('promoters')
          .upsert(
            { user_id: user.id, ...promoterFields },
            { onConflict: 'user_id' }
          )
          .then(r => ({ error: r.error }))
      );
    }

    // Update profiles row (always exists — created on sign-up)
    if (Object.keys(profileFields).length > 0) {
      updates.push(
        supabase
          .from('profiles')
          .update(profileFields)
          .eq('id', user.id)
          .then(r => ({ error: r.error }))
      );
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const results = await Promise.all(updates);
    const failed = results.filter(r => r.error);

    if (failed.length > 0) {
      console.error('[promoter/profile] PATCH errors:', failed.map(f => f.error));
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[promoter/profile] PATCH unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
