import type { Group } from '@/types/groups'

const perkGridStyles = `
  .perk-grid { grid-template-columns: repeat(3, 1fr) !important; }
  @media (max-width: 640px) { .perk-grid { grid-template-columns: 1fr !important; } }
  @media (min-width: 641px) and (max-width: 900px) { .perk-grid { grid-template-columns: repeat(2, 1fr) !important; } }
`

interface PerkCard {
  bg: string
  label: string
  headline: string
  sub: string
  caption: string
  textColor: string
}

const PERK_CARDS: Record<string, PerkCard[]> = {
  'book-club': [
    {
      bg: '#1AC8ED',
      label: 'Members Only',
      headline: '20%',
      sub: 'Off Books',
      caption: '20% off at participating Rochester bookstores — updated monthly',
      textColor: '#04342C',
    },
    {
      bg: '#59FFA0',
      label: 'Priority Access',
      headline: 'Front Row',
      sub: 'Author Events',
      caption: 'Reserved seating at all Book Club author events for members',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'This Month',
      headline: 'April\nPick',
      sub: 'Book Selection',
      caption: 'Monthly book selection announced to members first',
      textColor: '#121113',
    },
  ],
  'movie-critics': [
    {
      bg: '#F5A623',
      label: 'Exclusive',
      headline: 'Early\nAccess',
      sub: 'Screenings',
      caption: 'Advance screenings before public release — members only',
      textColor: '#121113',
    },
    {
      bg: '#59FFA0',
      label: 'Critic Perk',
      headline: 'Free\nEntry',
      sub: 'Premiere Nights',
      caption: 'Complimentary entry to select Rochester film premieres',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'Partner Deal',
      headline: '15%',
      sub: 'The Little',
      caption: '15% off at The Little Theatre for active members',
      textColor: '#121113',
    },
  ],
  'food-critics': [
    {
      bg: '#E8445A',
      label: 'Members Only',
      headline: 'Tasting\nAccess',
      sub: 'Exclusive Events',
      caption: 'Private tasting events at Rochester restaurants — not open to public',
      textColor: '#F9FDFF',
    },
    {
      bg: '#59FFA0',
      label: 'Critic Perk',
      headline: 'Chef\nMeets',
      sub: 'Kitchen Tours',
      caption: 'Behind-the-scenes chef meet-and-greets for active members',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'Partner Deal',
      headline: '10%',
      sub: 'Dining Partners',
      caption: '10% off at partner restaurants when you show your membership',
      textColor: '#121113',
    },
  ],
  'music-critics': [
    {
      bg: '#59FFA0',
      label: 'Members Only',
      headline: 'Front\nRow',
      sub: 'Local Shows',
      caption: 'Priority front row access at Rochester original artist showcases',
      textColor: '#04342C',
    },
    {
      bg: '#1AC8ED',
      label: 'Exclusive',
      headline: 'After\nShow',
      sub: 'Artist Access',
      caption: 'Meet artists backstage after shows — members only',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'Early Access',
      headline: 'First\nListen',
      sub: 'Release Events',
      caption: 'First access to album release events before public tickets drop',
      textColor: '#121113',
    },
  ],
  'birthday-club': [
    {
      bg: '#C97EF5',
      label: 'Birthday Month',
      headline: 'Free\nUpgrade',
      sub: 'Venue Specials',
      caption: 'Complimentary table upgrades at partner venues on your birthday',
      textColor: '#121113',
    },
    {
      bg: '#59FFA0',
      label: 'Surprise Perk',
      headline: 'VIP\nEntry',
      sub: 'Priority Door',
      caption: 'Skip the line — priority entry at all Birthday Club events',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'Members Only',
      headline: 'Exclusive\nNights',
      sub: 'Birthday Events',
      caption: 'Invitations to members-only birthday celebration events',
      textColor: '#121113',
    },
  ],
  'pregame': [
    {
      bg: '#FF6B9D',
      label: '21+ Members',
      headline: 'Skip\nThe Line',
      sub: 'Priority Entry',
      caption: 'Priority entry at all Pregame partner venues — no waiting',
      textColor: '#F9FDFF',
    },
    {
      bg: '#59FFA0',
      label: 'Ladies Only',
      headline: 'Exclusive\nNights',
      sub: 'Members Only',
      caption: 'Private Pregame events not listed on the public calendar',
      textColor: '#04342C',
    },
    {
      bg: '#F9FDFF',
      label: 'Partner Deal',
      headline: 'Free\nDrink',
      sub: 'Welcome Offer',
      caption: 'Complimentary welcome drink at select Pregame partner venues',
      textColor: '#121113',
    },
  ],
}

const DEFAULT_PERK_CARDS: PerkCard[] = [
  {
    bg: '#59FFA0',
    label: 'Members Only',
    headline: 'Early\nAccess',
    sub: 'Exclusive Events',
    caption: 'First access to exclusive group events before public tickets drop',
    textColor: '#04342C',
  },
  {
    bg: '#1AC8ED',
    label: 'Member Perk',
    headline: 'Special\nOffers',
    sub: 'Partner Deals',
    caption: 'Exclusive deals and discounts at RTNY partner venues',
    textColor: '#04342C',
  },
  {
    bg: '#F9FDFF',
    label: 'Priority',
    headline: 'VIP\nAccess',
    sub: 'Group Events',
    caption: 'Priority entry and reserved spots at all group-exclusive events',
    textColor: '#121113',
  },
]

const BENEFITS: Record<string, string[]> = {
  'movie-critics': [
    'Exclusive advance screenings and premieres',
    'Members-only tickets to film events',
    'Rate films and earn critic credibility',
    'Invites to private Q&As with filmmakers',
    'Partner deals at The Little Theatre',
  ],
  'food-critics': [
    'Access to exclusive tasting events',
    'Chef meet-and-greets and kitchen tours',
    'Members-only restaurant openings',
    'Rate Rochester restaurants and shape the scene',
    'Partner deals at local dining spots',
  ],
  'music-critics': [
    'Front row access to local artist showcases',
    'Early access to album release events',
    'Artist meet-and-greets after shows',
    'Rate and support Rochester original artists',
    'Members-only music events',
  ],
  'birthday-club': [
    'Exclusive birthday month event invites',
    'Venue specials during your birthday month',
    'Surprise perks and upgrades',
    'Priority entry at partner venues',
    'Members-only birthday celebrations',
  ],
  'book-club': [
    'Monthly curated book discussions',
    'Group-only tickets to author events',
    'Partner deals at local bookstores',
    'Suggest and vote on monthly selections',
    'Exclusive literary meetups across Rochester',
  ],
  'pregame': [
    'Exclusive ladies-only event access',
    'Priority entry at partner venues',
    'Members-only Pregame nights',
    'Curated group experiences 21+',
    'Special offers and upgrades at events',
  ],
}

const DEFAULT_BENEFITS = [
  'Access to exclusive group events',
  'Members-only tickets and perks',
  'Organizer posts and announcements',
  'Community polls and discussions',
  'Explore more Rochester communities',
]

interface Props {
  group: Group
}

export default function GroupValueSection({ group }: Props) {
  const perks = PERK_CARDS[group.slug] ?? DEFAULT_PERK_CARDS
  const benefits = BENEFITS[group.slug] ?? DEFAULT_BENEFITS

  return (
    <section
      style={{ backgroundColor: '#1a1a1c' }}
      className="px-6 md:px-10 py-14"
    >
      <style>{perkGridStyles}</style>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

        {/* Single section heading */}
        <p
          style={{
            fontFamily: 'Rubik, sans-serif',
            fontSize: '13px',
            color: '#7A7978',
            margin: '0 0 4px 0',
          }}
        >
          Members of {group.name} get access to:
        </p>
        <h2
          style={{
            fontFamily: 'Rokkitt, serif',
            fontSize: '28px',
            fontWeight: 900,
            color: '#F9FDFF',
            margin: '0 0 24px 0',
          }}
        >
          What You Get
        </h2>

        {/* Sub-label: Active Perks */}
        <p
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: group.accent_color,
            margin: '0 0 14px 0',
            fontWeight: 700,
          }}
        >
          Active Perks
        </p>

        {/* Perk cards grid — 3 columns, square edges, 1:1 aspect ratio */}
        <div
          className="perk-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '36px',
          }}
        >
          {perks.map((perk, i) => (
            <div key={i}>
              {/* Card — square edged, 1:1 */}
              <div
                style={{
                  backgroundColor: perk.bg,
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: '0',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: '9px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: perk.textColor,
                    opacity: 0.7,
                  }}
                >
                  {perk.label}
                </span>

                <div>
                  <div
                    style={{
                      fontFamily: 'Rokkitt, serif',
                      fontSize: 'clamp(18px, 4vw, 28px)',
                      fontWeight: 900,
                      color: perk.textColor,
                      lineHeight: 1.05,
                      whiteSpace: 'pre-line',
                      marginBottom: '4px',
                    }}
                  >
                    {perk.headline}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: perk.textColor,
                      opacity: 0.8,
                    }}
                  >
                    {perk.sub}
                  </div>
                </div>
              </div>

              {/* Caption — below the card, never inside it */}
              <p
                style={{
                  fontFamily: 'Rubik, sans-serif',
                  fontSize: '11px',
                  color: '#7A7978',
                  margin: '8px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                {perk.caption}
              </p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            margin: '36px 0 28px 0',
          }}
        />

        {/* Sub-label: Included Benefits */}
        <p
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '11px',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: group.accent_color,
            margin: '0 0 14px 0',
            fontWeight: 700,
          }}
        >
          Included Benefits
        </p>

        {/* Benefit tiles — square edges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px',
          }}
        >
          {benefits.map((benefit, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#121113',
                border: `1px solid ${group.accent_color}22`,
                borderRadius: '0',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: group.accent_color,
                  flexShrink: 0,
                  marginTop: '6px',
                }}
              />
              <span
                style={{
                  fontFamily: 'Rubik, sans-serif',
                  fontSize: '14px',
                  color: '#c8d8dc',
                  lineHeight: 1.5,
                }}
              >
                {benefit}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
