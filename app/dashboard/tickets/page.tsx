import { createSupabaseServer } from "@/lib/supabase"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TicketCard } from "@/components/custom/tickets/ticket-card"

export default async function MyTicketsPage() {
  const supabase = await createSupabaseServer()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch user's tickets with event details
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      ticket_type,
      base_price,
      confirmation_code,
      qr_code_data,
      purchase_date,
      events (
        id,
        name,
        event_date,
        flyer_image_url,
        venue_id,
        venues (
          name,
          address
        )
      )
    `)
    .eq('purchased_by', user.id)
    .order('purchase_date', { ascending: false })

  if (error) {
    console.error('Error fetching tickets:', error)
  }

  // Split tickets into upcoming and past
  const now = new Date()
  const upcomingTickets = tickets?.filter(ticket => 
    new Date(ticket.events.event_date) >= now
  ) || []
  
  const pastTickets = tickets?.filter(ticket => 
    new Date(ticket.events.event_date) < now
  ) || []

  // Empty state
  if (!tickets || tickets.length === 0) {
    return (
      <div className="min-h-screen bg-[#121113] pt-24 pb-12 px-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF] mb-8">
            My Tickets
          </h1>
          
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 text-6xl">🎟️</div>
            <h2 className="font-[family-name:var(--font-rokkitt)] text-2xl font-bold text-[#F9FDFF] mb-3">
              No tickets yet
            </h2>
            <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0] mb-8 max-w-md">
              Start exploring Rochester's nightlife and grab tickets to your first event!
            </p>
            <Link
              href="/events"
              className="rounded-lg bg-[#59FFA0] px-6 py-3 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#121113] pt-24 pb-12 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-[family-name:var(--font-rokkitt)] text-4xl font-bold text-[#F9FDFF] mb-8">
          My Tickets
        </h1>

        {/* Upcoming Tickets Section */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-rubik)] text-xl font-semibold text-[#59FFA0] mb-6">
            Upcoming Events
          </h2>
          
          {upcomingTickets.length === 0 ? (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-8 text-center">
              <p className="font-[family-name:var(--font-rubik)] text-[#A0A0A0] mb-4">
                No upcoming events
              </p>
              <Link
                href="/events"
                className="inline-block rounded-lg bg-[#59FFA0] px-6 py-2 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#121113] transition-all hover:bg-[#4DE08A]"
              >
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingTickets.map((ticket) => (
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  isPast={false}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past Tickets Section (Collapsible) */}
        {pastTickets.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4 transition-all group-open:border-[#59FFA0]/30">
                <h2 className="font-[family-name:var(--font-rubik)] text-lg font-medium text-[#A0A0A0]">
                  Past Events ({pastTickets.length})
                </h2>
                <svg 
                  className="h-5 w-5 text-[#A0A0A0] transition-transform group-open:rotate-180" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            
            <div className="mt-4 space-y-4">
              {pastTickets.map((ticket) => (
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  isPast={true}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}