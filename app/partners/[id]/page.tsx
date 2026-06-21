import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import SupportButton from '@/components/custom/partners/SupportButton'
import PartnerSharePill from '@/components/custom/partners/PartnerSharePill'

interface PageProps {
  params: Promise<{ id: string }>
}

function Divider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-[#59FFA0]/15 to-transparent my-2" />
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#59FFA0] to-[#1AC8ED]" />
      <span className="font-label text-xs tracking-[0.3em] uppercase text-[#F9FDFF]/50">
        {children}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#59FFA0]/20 to-transparent" />
    </div>
  )
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
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
  const hasCover = Boolean(partner.cover_image_url)
  const venueAddress = venue?.google_maps_url ?? (venue?.address ? `https://maps.google.com/?q=${encodeURIComponent(venue.address)}` : null)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121113', color: '#F9FDFF' }}>
      <div className="mx-auto w-full" style={{ maxWidth: 480 }}>

        {/* ── 1. COVER + HEADER ── */}
        <div className="relative">
          {/* Cover */}
          <div className="relative w-full overflow-hidden" style={{ height: 220 }}>
            {hasCover ? (
              <Image
                src={partner.cover_image_url}
                alt=""
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #121113 100%)' }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 40%, rgba(18,17,19,0.97) 100%)',
              }}
            />
          </div>

          {/* Logo + name block */}
          <div className="px-4 pb-6 -mt-10 relative z-10">
            {partner.logo_url ? (
              <div
                className="rounded-full overflow-hidden mb-3"
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
                className="rounded-full flex items-center justify-center mb-3 font-sans text-2xl font-bold"
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
        </div>

        <Divider />

        {/* ── 2. QUICK ACTION BAR ── */}
        <div className="px-4 py-5">
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
        </div>

        <Divider />

        {/* ── 3. SUPPORT BUTTON ── */}
        <div className="px-4 py-6">
          <SupportButton partnerId={id} initialCount={supporter_count} />
        </div>

        <Divider />

        {/* ── 4. STATS ROW ── */}
        <div className="px-4 py-6">
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
        </div>

        {/* ── 5. ABOUT ── */}
        {modules.about && partner.bio && (
          <>
            <Divider />
            <div className="px-4 py-6">
              <SectionLabel>ABOUT</SectionLabel>
              <p className="font-sans text-sm text-[#F9FDFF]/70 leading-7 tracking-wide">
                {partner.bio}
              </p>
            </div>
          </>
        )}

        {/* ── 6. UPCOMING EVENTS ── */}
        {modules.upcoming_events && upcoming_events?.length > 0 && (
          <>
            <Divider />
            <div className="px-4 py-6">
              <SectionLabel>UPCOMING EVENTS</SectionLabel>
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
            </div>
          </>
        )}

        {/* ── 7. GALLERY ── */}
        {modules.gallery && media?.length > 0 && (
          <>
            <Divider />
            <div className="px-4 py-6">
              <SectionLabel>GALLERY</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {media.map((item) => (
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
            </div>
          </>
        )}

        {/* ── 8. PLAN YOUR EVENT ── */}
        {modules.plan_your_event && (
          <>
            <Divider />
            <div className="px-4 py-6">
              <SectionLabel>PLAN YOUR EVENT</SectionLabel>
              <p
                className="font-sans text-sm mb-4"
                style={{ color: 'rgba(249,253,255,0.7)' }}
              >
                Book this partner for your next event
              </p>
              <Link
                href={`/plan?partner_id=${id}`}
                className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#EF9F27', color: '#121113' }}
              >
                Start Planning
              </Link>
            </div>
          </>
        )}

        {/* ── 9. CONTACT ── */}
        {(partner.contact_email || partner.contact_phone || partner.website_url) && (
          <>
            <Divider />
            <div className="px-4 py-6">
              <SectionLabel>CONTACT</SectionLabel>
              <div className="flex flex-col gap-4">
                {partner.contact_email && (
                  <div>
                    <p className="font-label text-[10px] tracking-widest uppercase text-[#F9FDFF]/40 mb-1">
                      EMAIL
                    </p>
                    <a
                      href={`mailto:${partner.contact_email}`}
                      className="flex items-center gap-3"
                    >
                      <span className="text-base">✉️</span>
                      <span className="font-sans text-sm text-[#1AC8ED] truncate">
                        {partner.contact_email}
                      </span>
                    </a>
                  </div>
                )}
                {partner.contact_phone && (
                  <div>
                    <p className="font-label text-[10px] tracking-widest uppercase text-[#F9FDFF]/40 mb-1">
                      PHONE
                    </p>
                    <a
                      href={`tel:${partner.contact_phone}`}
                      className="flex items-center gap-3"
                    >
                      <span className="text-base">📞</span>
                      <span className="font-sans text-sm text-[#1AC8ED]">
                        {partner.contact_phone}
                      </span>
                    </a>
                  </div>
                )}
                {partner.website_url && (
                  <div>
                    <p className="font-label text-[10px] tracking-widest uppercase text-[#F9FDFF]/40 mb-1">
                      WEBSITE
                    </p>
                    <a
                      href={partner.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      <span className="text-base">🌐</span>
                      <span className="font-sans text-sm text-[#1AC8ED] truncate">
                        {partner.website_url.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="h-10" />
      </div>
    </div>
  )
}
