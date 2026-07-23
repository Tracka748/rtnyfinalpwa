// components/custom/events/event-card.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Heart } from 'lucide-react';
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
    ticket_types?: { price: number }[];
    total_tickets: number;
    tickets_sold: number;
    featured: boolean;
    venues?: {
      name: string;
      address?: string;
    };
  };
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function EventCard({ event, isSaved = false, onToggleSave }: EventCardProps) {
  const [imageError, setImageError] = useState(false);
  const [pulse, setPulse] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[event.category];

  // Calculate lowest price
  const getLowestPrice = () => {
    if (!event.ticket_types || event.ticket_types.length === 0) return null;
    const prices = event.ticket_types
      .map(t => t.price)
      .filter(p => typeof p === 'number');
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const lowestPrice = getLowestPrice();
  const ticketsRemaining = event.total_tickets - event.tickets_sold;
  const soldOutSoon = ticketsRemaining > 0 && ticketsRemaining <= 20;
  const soldOut = ticketsRemaining === 0;

  // Stat chip values
  const isFree = lowestPrice === 0;
  const eventTime = format(new Date(event.event_date), 'h:mm a');
  const remainingPct = event.total_tickets > 0 ? ticketsRemaining / event.total_tickets : 1;
  const availabilityLabel = ticketsRemaining < 10 ? 'Last Few' : remainingPct < 0.2 ? 'Selling Fast' : 'Available';
  const availabilityClass = ticketsRemaining < 10 ? 'text-[#FF4D4D]' : remainingPct < 0.2 ? 'text-[#F59E0B]' : 'text-[#22D3EE]';

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
    onToggleSave?.();
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block"
    >
      <article className="relative h-full bg-[#111318] rounded-[10px] overflow-hidden border-[0.5px] border-[rgba(255,255,255,0.1)] hover:border-accent/50 transition-all duration-300 hover:shadow-2xl hover:shadow-accent/10 hover:-translate-y-1">
        {/* Heart / Save button */}
        <button
          type="button"
          onClick={handleSaveClick}
          aria-label={isSaved ? 'Unsave event' : 'Save event'}
          className={cn(
            'absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-black/45 backdrop-blur-sm transition-transform',
            pulse ? 'scale-125' : 'active:scale-90'
          )}
        >
          <Heart
            size={16}
            className="transition-colors"
            fill={isSaved ? '#ef4444' : 'none'}
            stroke={isSaved ? '#ef4444' : 'rgba(255,255,255,0.7)'}
            strokeWidth={2}
          />
        </button>

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

            {/* Stat chips */}
            <div className="flex items-center gap-1.5">
              {/* Price chip */}
              <div className={cn(
                "flex-1 flex items-center justify-center px-2 py-1 rounded-md border-[0.5px] border-[rgba(255,255,255,0.08)] bg-[#0d0f14] text-[10px] font-semibold",
                isFree ? 'text-[#59FFA0]' : 'text-slate-200'
              )}>
                {isFree ? 'Free' : lowestPrice !== null ? `$${lowestPrice % 1 === 0 ? lowestPrice : lowestPrice.toFixed(2)}` : 'TBA'}
              </div>
              {/* Time chip */}
              <div className="flex-1 flex items-center justify-center px-2 py-1 rounded-md border-[0.5px] border-[rgba(255,255,255,0.08)] bg-[#0d0f14] text-[10px] font-semibold text-foreground/80">
                {eventTime}
              </div>
              {/* Availability chip */}
              <div className={cn(
                "flex-1 flex items-center justify-center px-2 py-1 rounded-md border-[0.5px] border-[rgba(255,255,255,0.08)] bg-[#0d0f14] text-[10px] font-semibold",
                availabilityClass
              )}>
                {availabilityLabel}
              </div>
            </div>

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
                      <span className="text-[10px] md:text-xs text-[#7DD8E8] font-medium">From</span>
                      <span className="font-serif font-bold text-lg md:text-xl text-accent">
                        ${lowestPrice.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs md:text-sm text-[#7DD8E8]">Price TBA</span>
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
