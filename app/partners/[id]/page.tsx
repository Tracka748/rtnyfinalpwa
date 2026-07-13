import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarPlus, Mail, Phone, Globe, Building2 } from 'lucide-react'
import SupportButton from '@/components/custom/partners/SupportButton'
import PartnerSharePill from '@/components/custom/partners/PartnerSharePill'
import ProfileSection from '@/components/custom/partners/ProfileSection'
import { EventCardWeek, type WeekEvent, type EventCategory } from '@/components/custom/events/event-card-week'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Carousel view is parked behind this flag until flyer-image coverage/QA is finalized.
// Flip PARTNER_EVENTS_CAROUSEL_ENABLED=true in the environment to preview it; default is the text-row layout.
const EVENTS_CAROUSEL_ENABLED = process.env.PARTNER_EVENTS_CAROUSEL_ENABLED === 'true'

function formatEventDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} • ${time}`
}

function getLowestPrice(ticketPrices: unknown): string | undefined {
  if (!ticketPrices || typeof ticketPrices !== 'object') return undefined
  const prices = Object.values(ticketPrices as Record<string, unknown>).filter(
    (p): p is number => typeof p === 'number'
  )
  if (prices.length === 0) return undefined
  const lowest = Math.min(...prices)
  return lowest === 0 ? 'Free' : `From $${lowest % 1 === 0 ? lowest : lowest.toFixed(2)}`
}

function ActionPill({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label text-xs tracking-wider"
      style={{
        backgroundColor: '#1a1819',
        border: '1px solid #1AC8ED',
        color: '#1AC8ED',
      }}
    >
      {children}
    </a>
  )
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const { id } = await params

  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const res = await fetch(`${baseUrl}/api/v1/partners/${id}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })

  if (res.status === 404) notFound()
  if (!res.ok) notFound()

  const json = await res.json()
  if (!json.success) notFound()

  const { partner, venue, media, supporter_count, upcoming_events } = json.data as {
    partner: Record<string, any>
    venue: Record<string, any> | null
    vendor: Record<string, any> | null
    media: Array<Record<string, any>>
    supporter_count: number
    upcoming_events: Array<Record<string, any>>
  }

  const modules = (partner.visible_modules as Record<string, boolean>) ?? {}
  const venueAddress = venue?.google_maps_url ?? (venue?.address ? `https://maps.google.com/?q=${encodeURIComponent(venue.address)}` : null)
  const hasCoverImage = Boolean(partner.cover_image_url && partner.cover_image_url.trim())
  const hasLogoImage = Boolean(partner.logo_url && partner.logo_url.trim())

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121113', color: '#F9FDFF' }}>
      <div className="mx-auto w-full" style={{ maxWidth: 480 }}>

        {/* ── 1. HERO ── */}
        <div className="relative">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '21 / 9' }}>
            {hasCoverImage && (
              <Image
                src={partner.cover_image_url}
                alt=""
                fill
                className="object-cover"
                priority
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 55%, rgba(18,17,19,0.95) 100%)',
              }}
            />
          </div>

          {/* Avatar overlapping bottom-left of hero */}
          <div className="absolute left-4 z-10" style={{ bottom: -36 }}>
            {hasLogoImage ? (
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: 80,
                  height: 80,
                  border: '2px solid #59FFA0',
                  boxShadow: '0 0 0 3px #121113',
                }}
              >
                <Image
                  src={partner.logo_url}
                  alt={partner.display_name ?? partner.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div
                className="rounded-full flex items-center justify-center font-sans text-2xl font-bold"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: '#1f1f2e',
                  border: '2px solid #59FFA0',
                  boxShadow: '0 0 0 3px #121113',
                  color: '#59FFA0',
                }}
              >
                {(partner.display_name ?? partner.name ?? '?')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name block */}
        <div className="px-4 pt-12 pb-6">
          {/* Category label */}
          {partner.category && (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#59FFA0] animate-pulse" />
              <span className="font-label text-xs tracking-[0.25em] uppercase text-[#59FFA0]">
                {partner.category}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-slab-serif text-3xl font-bold leading-tight">
              <span
                style={{
                  background: 'linear-gradient(135deg, #59FFA0 0%, #1AC8ED 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline',
                }}
              >
                {partner.display_name ?? partner.name}
              </span>
            </h1>
            {partner.verified && (
              <span
                className="inline-flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#1AC8ED',
                  color: '#121113',
                  fontSize: 11,
                }}
                title="Verified Partner"
              >
                ✓
              </span>
            )}
          </div>

          {partner.tagline && (
            <p className="font-serif italic text-sm text-[#F9FDFF]/70 mt-1 leading-relaxed">
              {partner.tagline}
            </p>
          )}

          {partner.partner_type && (
            <span
              className="inline-block mt-2 px-3 py-1 rounded-full font-label text-xs tracking-widest uppercase"
              style={{
                color: '#59FFA0',
                border: '1px solid rgba(89,255,160,0.3)',
                backgroundColor: 'rgba(89,255,160,0.08)',
              }}
            >
              {partner.partner_type}
            </span>
          )}
        </div>

        {/* ── 2. QUICK ACTION BAR ── */}
        <ProfileSection color="mint" label="Quick Actions">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {partner.website_url && (
              <ActionPill href={partner.website_url}>🌐 Website</ActionPill>
            )}
            {venueAddress && (
              <ActionPill href={venueAddress}>📍 Directions</ActionPill>
            )}
            {(partner.contact_email || partner.contact_phone) && (
              <ActionPill
                href={
                  partner.contact_email
                    ? `mailto:${partner.contact_email}`
                    : `tel:${partner.contact_phone}`
                }
              >
                ✉️ Contact
              </ActionPill>
            )}
            <PartnerSharePill name={partner.name} />
          </div>
        </ProfileSection>

        {/* ── 3. SUPPORT CARD ── */}
        <SupportButton partnerId={id} initialCount={supporter_count} />

        {/* ── 4. STATS ROW ── */}
        <ProfileSection color="mint" label="Community">
          <div className="grid grid-cols-3">
            <div className="text-center pr-4" style={{ borderRight: '0.5px solid rgba(255,255,255,0.1)' }}>
              <p className="font-label text-[10px] tracking-[0.2em] uppercase text-[#F9FDFF]/40 mt-1">
                SUPPORTERS
              </p>
              <p className="font-serif text-2xl font-bold text-[#F9FDFF]">
                {supporter_count.toLocaleString()}
              </p>
            </div>
            <div className="text-center px-4" style={{ borderRight: '0.5px solid rgba(255,255,255,0.1)' }}>
              <p className="font-label text-[10px] tracking-[0.2em] uppercase text-[#F9FDFF]/40 mt-1">
                EVENTS HOSTED
              </p>
              <p className="font-serif text-2xl font-bold text-[#F9FDFF]">
                {partner.events_count ?? '—'}
              </p>
            </div>
            <div className="text-center pl-4">
              <p className="font-label text-[10px] tracking-[0.2em] uppercase text-[#F9FDFF]/40 mt-1">
                VERIFIED
              </p>
              <p
                className="font-serif text-2xl font-bold"
                style={{ color: partner.verified ? '#59FFA0' : 'rgba(249,253,255,0.3)' }}
              >
                {partner.verified ? '✓ Yes' : '—'}
              </p>
            </div>
          </div>
        </ProfileSection>

        {/* ── 5. ABOUT ── */}
        {modules.about && partner.bio && (
          <ProfileSection color="cyan" label="About">
            <div className="relative">
              <Building2
                size={72}
                strokeWidth={1}
                color="#1AC8ED"
                className="absolute -right-1 -top-1 pointer-events-none"
                style={{ opacity: 0.12 }}
              />
              <p className="font-sans text-sm text-[#F9FDFF]/70 leading-7 tracking-wide pr-14">
                {partner.bio}
              </p>
            </div>
          </ProfileSection>
        )}

        {/* ── 6. UPCOMING EVENTS ── */}
        {modules.upcoming_events && upcoming_events?.length > 0 && (
          <ProfileSection color="mint" label="Upcoming Events">
            {EVENTS_CAROUSEL_ENABLED ? (
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {upcoming_events.map((event) => {
                  const weekEvent: WeekEvent = {
                    id: event.id,
                    name: event.name,
                    venue: venue?.name ?? partner.display_name ?? partner.name,
                    time: formatEventDateTime(event.event_date),
                    price: getLowestPrice(event.ticket_prices),
                    category: (event.category as EventCategory) ?? 'nightlife',
                    imageUrl: event.flyer_image_url ?? null,
                    description: event.description,
                  }
                  return (
                    <div key={event.id} className="w-36 shrink-0">
                      <EventCardWeek event={weekEvent} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming_events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      backgroundColor: '#1a1819',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-slab-serif text-sm font-semibold text-[#F9FDFF] truncate">
                        {event.name}
                      </p>
                      <p className="font-label text-xs tracking-wider text-[#1AC8ED] mt-0.5">
                        {formatEventDate(event.event_date)}
                      </p>
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className="flex-shrink-0 font-label text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(26,200,237,0.1)',
                        color: '#1AC8ED',
                        border: '1px solid rgba(26,200,237,0.3)',
                      }}
                    >
                      Tickets
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </ProfileSection>
        )}

        {/* ── 7. GALLERY ── */}
        {modules.gallery && media?.length > 0 && (
          <ProfileSection color="cyan" label="Gallery">
            <div className="grid grid-cols-3 gap-2">
              {media
                .filter((item) => item.url && item.url.trim())
                .map((item) => (
                  <div key={item.id} className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
            </div>
          </ProfileSection>
        )}

        {/* ── 8. PLAN YOUR EVENT ── */}
        {modules.plan_your_event && (
          <div
            className="mx-4 mb-5 rounded-2xl p-5 flex items-center gap-4"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 48, height: 48, backgroundColor: 'rgba(168,85,247,0.12)' }}
            >
              <CalendarPlus size={22} color="#a855f7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-slab-serif text-base font-bold text-[#F9FDFF]">
                Plan Your Event
              </h3>
              <p className="font-sans text-xs text-[#F9FDFF]/60 mt-0.5">
                Book this partner for your next event
              </p>
            </div>
            <Link
              href={`/plan?partner_id=${id}`}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm text-center transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#a855f7', color: '#121113' }}
            >
              Start Planning
            </Link>
          </div>
        )}

        {/* ── 9. CONTACT ── */}
        {(partner.contact_email || partner.contact_phone || partner.website_url) && (
          <ProfileSection color="cyan" label="Contact">
            <div className="grid grid-cols-3 gap-3">
              {partner.contact_email && (
                <a
                  href={`mailto:${partner.contact_email}`}
                  className="flex flex-col items-center text-center gap-1.5 min-w-0"
                >
                  <Mail size={18} color="#1AC8ED" />
                  <p className="font-label text-[9px] tracking-widest uppercase text-[#F9FDFF]/40">
                    Email
                  </p>
                  <p className="font-sans text-[11px] leading-snug text-[#1AC8ED] break-words w-full">
                    {partner.contact_email}
                  </p>
                </a>
              )}
              {partner.contact_phone && (
                <a
                  href={`tel:${partner.contact_phone}`}
                  className="flex flex-col items-center text-center gap-1.5 min-w-0"
                >
                  <Phone size={18} color="#1AC8ED" />
                  <p className="font-label text-[9px] tracking-widest uppercase text-[#F9FDFF]/40">
                    Phone
                  </p>
                  <p className="font-sans text-[11px] leading-snug text-[#1AC8ED] break-words w-full">
                    {partner.contact_phone}
                  </p>
                </a>
              )}
              {partner.website_url && (
                <a
                  href={partner.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center text-center gap-1.5 min-w-0"
                >
                  <Globe size={18} color="#1AC8ED" />
                  <p className="font-label text-[9px] tracking-widest uppercase text-[#F9FDFF]/40">
                    Website
                  </p>
                  <p className="font-sans text-[11px] leading-snug text-[#1AC8ED] break-words w-full">
                    {partner.website_url.replace(/^https?:\/\//, '')}
                  </p>
                </a>
              )}
            </div>
          </ProfileSection>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
