"use client"

import Image from "next/image"
import Link from "next/link"

interface TicketCardProps {
  ticket: any
  isPast: boolean
}

export function TicketCard({ ticket, isPast }: TicketCardProps) {

  const event = ticket.events
  const eventDate = new Date(event.event_date)
  const now = new Date()

  // Calculate time until event
  const getDaysUntil = () => {
    const diffTime = eventDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Tonight"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays < 7) return `In ${diffDays} days`
    return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`rounded-lg border ${isPast ? 'border-[#2A2A2A] bg-[#1A1A1A]/50' : 'border-[#59FFA0]/20 bg-[#1A1A1A]'} overflow-hidden`}>
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Event Image */}
        <div className="relative w-full sm:w-32 h-40 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-[#2A2A2A]">
          {event.flyer_image_url ? (
            <Image
              src={event.flyer_image_url}
              alt={event.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-4xl">🎉</span>
            </div>
          )}
        </div>

        {/* Ticket Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              {!isPast && (
                <span className="inline-block rounded-full bg-[#59FFA0]/20 px-3 py-1 font-[family-name:var(--font-rubik)] text-xs font-medium text-[#59FFA0] mb-2">
                  {getDaysUntil()}
                </span>
              )}
              <h3 className="font-[family-name:var(--font-rokkitt)] text-xl font-bold text-[#F9FDFF]">
                {event.name}
              </h3>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <p className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              📅 {eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              📍 {event.venues?.name || 'Venue TBA'}
            </p>
            <p className="font-[family-name:var(--font-rubik)] text-sm text-[#A0A0A0]">
              🎟️ {ticket.ticket_type} • Ticket #{ticket.ticket_number}
            </p>
            {ticket.confirmation_code && (
              <p className="font-[family-name:var(--font-rubik)] text-xs text-[#666]">
                Confirmation: {ticket.confirmation_code}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!isPast && (
              <Link
                href={`/events/${event.id}`}
                className="rounded-lg border border-[#2A2A2A] bg-[#2A2A2A] px-4 py-2 font-[family-name:var(--font-rubik)] text-sm font-medium text-[#F9FDFF] transition-all hover:bg-[#3A3A3A]"
              >
                View Event
              </Link>
            )}
            {isPast && (
              <Link
                href={`/events/${event.id}`}
                className="font-[family-name:var(--font-rubik)] text-sm text-[#59FFA0] underline-offset-2 hover:underline"
              >
                View Event Details
              </Link>
            )}
          </div>

          {/* QR Code Display */}
          <div className="mt-4 p-4 rounded-lg bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                {ticket.qr_code_data ? (
                  <img
                    src={ticket.qr_code_data}
                    alt="Ticket QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-[#7DD8E8] text-xs block">QR Code</span>
                    <span className="text-gray-300 text-xs">Not available</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[#121113] font-[family-name:var(--font-rubik)]">
                Scan at venue entrance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
