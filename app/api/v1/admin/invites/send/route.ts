// NOTE: Before using this route, run the following in Supabase SQL Editor:
//
// CREATE TABLE IF NOT EXISTS public.invite_runs (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   event_id UUID REFERENCES public.events(id),
//   sent_count INT DEFAULT 0,
//   target_neighborhoods TEXT[] DEFAULT '{}',
//   target_vibes TEXT[] DEFAULT '{}',
//   target_age_ranges TEXT[] DEFAULT '{}',
//   created_by UUID REFERENCES auth.users(id),
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE public.invite_runs ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Admins manage invite runs" ON public.invite_runs
//   FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { checkIsAdmin } from '@/lib/admin-auth';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const resend = new Resend(process.env.RESEND_API_KEY!);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEventTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function buildInviteHtml(params: {
  eventId: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
  ticketPrice: number | null;
  previewText?: string;
}): string {
  const { eventId, eventName, eventDate, venueName, venueAddress, ticketPrice, previewText } = params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rtny.com';
  const ticketsUrl = `${baseUrl}/events/${eventId}`;
  const priceDisplay = ticketPrice != null && ticketPrice > 0 ? `$${ticketPrice}` : 'Free';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited</title>
  ${previewText ? `<span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#121113;font-family:'Poppins',Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#121113;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1a1a1c;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="background-color:#121113;padding:32px 40px 24px;text-align:center;border-bottom:1px solid #2a2a2a;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#59FFA0;">RTNY</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:36px;font-weight:700;color:#59FFA0;line-height:1.1;">
                You're Invited 🎟️
              </h1>
              <p style="margin:0;font-size:14px;color:#888888;">You've been hand-picked for this one.</p>
            </td>
          </tr>

          <!-- Event Card -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#121113;border-radius:10px;border:1px solid #2a2a2a;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 24px;">
                    <!-- Event Name -->
                    <h2 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">
                      ${eventName}
                    </h2>

                    <!-- Details -->
                    <table cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:20px;padding-right:12px;vertical-align:middle;">
                                <span style="font-size:16px;">📅</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:14px;color:#cccccc;">${formatEventDate(eventDate)}</p>
                                <p style="margin:2px 0 0;font-size:13px;color:#888888;">${formatEventTime(eventDate)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:20px;padding-right:12px;vertical-align:middle;">
                                <span style="font-size:16px;">📍</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:14px;color:#cccccc;">${venueName}</p>
                                ${venueAddress ? `<p style="margin:2px 0 0;font-size:13px;color:#888888;">${venueAddress}</p>` : ''}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:20px;padding-right:12px;vertical-align:middle;">
                                <span style="font-size:16px;">🎫</span>
                              </td>
                              <td>
                                <p style="margin:0;font-size:14px;color:#cccccc;">Tickets from <strong style="color:#59FFA0;">${priceDisplay}</strong></p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <a href="${ticketsUrl}"
                 style="display:inline-block;background-color:#59FFA0;color:#121113;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;letter-spacing:0.5px;">
                Get Tickets
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0e0e10;padding:24px 40px;text-align:center;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">
                You received this because your vibe matches this event.<br />
                <a href="${baseUrl}" style="color:#59FFA0;text-decoration:none;">rtny.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  const adminCheck = await checkIsAdmin();
  if (adminCheck.error) return adminCheck.response;

  try {
    const body = await request.json();
    const {
      event_id,
      target_neighborhoods = [],
      target_vibes = [],
      target_age_ranges = [],
      subject,
      preview_text,
    } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'event_id is required', success: false },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Query 1: profiles — filter by neighborhood if provided
    let profilesQuery = supabase
      .from('profiles')
      .select('id, first_name, neighborhood, age_range');

    if (target_neighborhoods.length > 0) {
      profilesQuery = profilesQuery.in('neighborhood', target_neighborhoods);
    }

    const { data: profiles } = await profilesQuery;

    // Query 2: user_vibes — filter by overlap if vibes provided
    let vibesQuery = supabase.from('user_vibes').select('user_id, vibe_tags');
    if (target_vibes.length > 0) {
      vibesQuery = vibesQuery.overlaps('vibe_tags', target_vibes);
    }
    const { data: userVibes } = await vibesQuery;

    // Query 3: event + venue details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found', success: false },
        { status: 404 }
      );
    }

    let venue: { name?: string; address?: string } | null = null;
    if (event.venue_id) {
      const { data: venueData } = await supabase
        .from('venues')
        .select('name, address')
        .eq('id', event.venue_id)
        .single();
      venue = venueData ?? null;
    }

    // Build vibe map: profile.id -> tags[]
    // NOTE: user_vibes.user_id corresponds to profiles.id
    const vibeMap = new Map<string, string[]>();
    (userVibes ?? []).forEach((row) => {
      const tags: string[] = Array.isArray(row.vibe_tags) ? row.vibe_tags : [];
      vibeMap.set(row.user_id, tags);
    });

    // Match logic: OR across active filters; if none set — match all
    const noFilters =
      target_neighborhoods.length === 0 &&
      target_vibes.length === 0 &&
      target_age_ranges.length === 0;

    const matchedProfileIds: string[] = [];

    for (const profile of profiles ?? []) {
      if (noFilters) {
        matchedProfileIds.push(profile.id);
        continue;
      }

      const neighborhoodMatch =
        target_neighborhoods.length > 0 &&
        target_neighborhoods.includes(
          profile.neighborhood?.toLowerCase().replace(/\s+/g, '_') ?? ''
        );

      const ageMatch =
        target_age_ranges.length > 0 &&
        target_age_ranges.includes(profile.age_range ?? '');

      const userTags = vibeMap.get(profile.id) ?? [];
      const vibeMatch =
        target_vibes.length > 0 &&
        target_vibes.some((tag: string) => userTags.includes(tag));

      if (neighborhoodMatch || ageMatch || vibeMatch) {
        matchedProfileIds.push(profile.id);
      }
    }

    // Also include profiles matched via vibes that weren't in the profiles query
    if (target_vibes.length > 0 && target_neighborhoods.length === 0) {
      const profileIdSet = new Set(matchedProfileIds);
      for (const vibe of userVibes ?? []) {
        if (!profileIdSet.has(vibe.user_id)) {
          const tags: string[] = Array.isArray(vibe.vibe_tags) ? vibe.vibe_tags : [];
          if (target_vibes.some((t: string) => tags.includes(t))) {
            matchedProfileIds.push(vibe.user_id);
            profileIdSet.add(vibe.user_id);
          }
        }
      }
    }

    // Get emails from auth.users
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 10000 });
    const authUsers = authData?.users ?? [];
    const emailMap = new Map<string, string>();
    authUsers.forEach((u) => {
      if (u.email) emailMap.set(u.id, u.email);
    });

    // Build final recipient list
    const recipients: { email: string; firstName: string }[] = [];
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    for (const profileId of matchedProfileIds) {
      const email = emailMap.get(profileId);
      if (!email) continue;
      const profile = profileMap.get(profileId);
      recipients.push({ email, firstName: profile?.first_name ?? '' });
    }

    // Build email content
    const venueName = venue?.name ?? 'TBA';
    const venueAddress = venue?.address ?? '';
    const ticketPrice = event.ticket_prices?.general ?? null;
    const emailSubject =
      subject ?? `You're Invited: ${event.name} at ${venueName}`;

    const htmlBody = buildInviteHtml({
      eventId: event_id,
      eventName: event.name,
      eventDate: event.event_date,
      venueName,
      venueAddress,
      ticketPrice,
      previewText: preview_text,
    });

    // Send emails individually with 100ms delay
    let sentCount = 0;
    for (const recipient of recipients) {
      try {
        await resend.emails.send({
          from: 'RTNY <onboarding@resend.dev>',
          to: recipient.email,
          subject: emailSubject,
          html: htmlBody,
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send invite to ${recipient.email}:`, emailErr);
      }
      await sleep(100);
    }

    // Log invite run
    const currentUser = await getCurrentUser();
    await supabase.from('invite_runs').insert({
      event_id,
      sent_count: sentCount,
      target_neighborhoods,
      target_vibes,
      target_age_ranges,
      created_by: currentUser?.id ?? null,
    });

    return NextResponse.json({
      success: true,
      data: { sent_count: sentCount, matched_users: recipients.length },
    });
  } catch (error) {
    console.error('Invite send error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
