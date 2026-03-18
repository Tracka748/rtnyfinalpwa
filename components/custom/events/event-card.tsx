// components/custom/events/event-card.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { EventCategory } from '@/types/database';
import { cn } from '@/lib/utils';
import { DEFAULT_EVENT_IMAGE, getEventImage } from '@/lib/image-utils';

const CATEGORY_CONFIG: Record<EventCategory, {
  icon: string;
  label: string;
  gradient: string;
}> = {
  nightlife: {
    icon: '🎉',
    label: 'Nightlife',
    gradient: 'from-purple-500/80 to-pink-500/80'
  },
  family: {
    icon: '👨‍👩‍👧‍👦',
    label: 'Family',
    gradient: 'from-blue-500/80 to-cyan-500/80'
  },
  movies: {
    icon: '🎬',
    label: 'Movies',
    gradient: 'from-red-500/80 to-orange-500/80'
  },
  dining: {
    icon: '🍽️',
    label: 'Dining',
    gradient: 'from-orange-500/80 to-yellow-500/80'
  },
  arts: {
    icon: '🎨',
    label: 'Arts',
    gradient: 'from-pink-500/80 to-purple-500/80'
  },
  sports: {
    icon: '⚽',
    label: 'Sports',
    gradient: 'from-green-500/80 to-emerald-500/80'
  },
};

interface EventCardProps {
  event: {
    id: string;
    name: string;
    description: string;
    category: EventCategory;
    event_date: string;
    flyer_image_url: string | null;
    ticket_prices: any;
    total_tickets: number;
    tickets_sold: number;
    featured: boolean;
    venues?: {
      name: string;
      address?: string;
    };
  };
}

export function EventCard({ event }: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[event.category];

  // Calculate lowest price
  const getLowestPrice = () => {
    if (!event.ticket_prices) return null;
    const prices = Object.values(event.ticket_prices).filter(p => typeof p === 'number');
    return prices.length > 0 ? Math.min(...prices as number[]) : null;
  };

  const lowestPrice = getLowestPrice();
  const ticketsRemaining = event.total_tickets - event.tickets_sold;
  const soldOutSoon = ticketsRemaining > 0 && ticketsRemaining <= 20;
  const soldOut = ticketsRemaining === 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block"
    >
      <article className="relative h-full bg-card rounded-2xl overflow-hidden border border-border hover:border-accent/50 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1">

        {/* Image Container - Fixed Aspect Ratio */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary/10">
          {!imageError ? (
            <img
              src={getEventImage(event.flyer_image_url, event.category)}
              alt={event.name}
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_EVENT_IMAGE) {
                  e.currentTarget.src = DEFAULT_EVENT_IMAGE;
                  return;
                }
                setImageError(true);
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center bg-gradient-to-br",
              categoryConfig.gradient
            )}>
              <span className="text-8xl opacity-50">{categoryConfig.icon}</span>
            </div>
          )}

          {/* Gradient Overlay - Improves text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          {/* Top Badges Row */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            {/* Featured Badge */}
            {event.featured && (
              <div className="bg-accent text-background px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                ⭐ Featured
              </div>
            )}

            {/* Category Badge */}
            <div className="ml-auto bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2">
              <span className="text-sm">{categoryConfig.icon}</span>
              <span className="text-xs font-semibold text-foreground/80">
                {categoryConfig.label}
              </span>
            </div>
          </div>

          {/* Bottom Content - Event Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 space-y-2 md:space-y-3">
            {/* Event Title */}
            <h3 className="font-slab-serif font-bold text-xl md:text-2xl leading-tight text-foreground line-clamp-2 group-hover:text-accent transition-colors">
              {event.name}
            </h3>

            {/* Metadata Grid */}
            <div className="space-y-1.5 md:space-y-2">
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-xs md:text-sm text-foreground/90">
                <span className="text-sm md:text-base">📅</span>
                <time className="font-medium">
                  {format(new Date(event.event_date), 'EEE, MMM d • h:mm a')}
                </time>
              </div>

              {/* Venue */}
              {event.venues?.name && (
                <div className="flex items-center gap-2 text-xs md:text-sm text-foreground/90">
                  <span className="text-sm md:text-base">📍</span>
                  <span className="font-medium line-clamp-1">{event.venues.name}</span>
                </div>
              )}

              {/* Price & Availability - Single Row */}
              <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                {/* Price */}
                <div className="flex items-center gap-1.5 md:gap-2">
                  {lowestPrice !== null ? (
                    <>
                      <span className="text-[10px] md:text-xs text-foreground/60 font-medium">From</span>
                      <span className="font-serif font-bold text-lg md:text-xl text-accent">
                        ${lowestPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs md:text-sm text-foreground/60">Price TBA</span>
                  )}
                </div>

                {/* Availability Badge */}
                <div className={cn(
                  "px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold",
                  soldOut
                    ? "bg-red-500/20 text-red-400"
                    : soldOutSoon
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-accent/20 text-accent"
                )}>
                  {soldOut ? (
                    "Sold Out"
                  ) : soldOutSoon ? (
                    <span><span className="hidden md:inline">Only </span>{ticketsRemaining} left</span>
                  ) : (
                    <span>{ticketsRemaining} <span className="md:hidden">avail</span><span className="hidden md:inline">available</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
