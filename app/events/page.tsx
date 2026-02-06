'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { EventCategory } from '@/types/database';
import { CategoryFilter } from '@/components/custom/events/category-filter';
import { EventCard } from '@/components/custom/events/event-card';

function EventCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <div className="relative aspect-[3/4] bg-secondary/10 animate-pulse">
        {/* Badge placeholder */}
        <div className="absolute top-4 right-4 w-24 h-7 bg-secondary/20 rounded-full" />
        {/* Bottom content placeholder */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
          <div className="h-7 bg-secondary/20 rounded w-3/4" />
          <div className="h-4 bg-secondary/20 rounded w-1/2" />
          <div className="h-4 bg-secondary/20 rounded w-2/3" />
          <div className="flex justify-between pt-2 border-t border-foreground/10">
            <div className="h-6 bg-secondary/20 rounded w-20" />
            <div className="h-6 bg-secondary/20 rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Event {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  event_date: string;
  venue_id: string;
  flyer_image_url: string | null;
  ticket_prices: any;
  total_tickets: number;
  tickets_sold: number;
  featured: boolean;
  venues: {
    name: string;
    address: string;
  };
}

const EVENTS_PER_PAGE = 12;

function EventsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(
    (searchParams.get('category') as EventCategory) || null
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [events, setEvents] = useState<Event[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<EventCategory, number>>();
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(EVENTS_PER_PAGE);

  // Fetch category counts
  useEffect(() => {
    async function fetchCounts() {
      const res = await fetch('/api/v1/events/stats');
      const data = await res.json();
      setCategoryCounts(data.counts);
    }
    fetchCounts();
  }, []);

  // Fetch events when filters change
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);

      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (searchQuery) params.set('q', searchQuery);

      const url = `/api/v1/events${params.toString() ? '?' + params.toString() : ''}`;

      const res = await fetch(url);
      const data = await res.json();

      setEvents(data.events || []);
      setDisplayCount(EVENTS_PER_PAGE); // Reset pagination when filters change
      setLoading(false);
    }

    fetchEvents();
  }, [selectedCategory, searchQuery]);

  // Update URL when category changes
  const handleCategoryChange = (category: EventCategory | null) => {
    setSelectedCategory(category);

    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }

    // Keep search query if it exists
    if (searchQuery) {
      params.set('q', searchQuery);
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  // Update URL when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchQuery) {
        params.set('q', searchQuery);
      } else {
        params.delete('q');
      }

      // Keep category if it exists
      if (selectedCategory) {
        params.set('category', selectedCategory);
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    }, 500); // Debounce search by 500ms

    return () => clearTimeout(timer);
  }, [searchQuery]); // Only trigger on searchQuery change

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    router.push(pathname, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent/5 to-transparent border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-5xl font-bold mb-3">
            Discover <span className="text-accent">Rochester</span>
          </h1>
          <p className="text-xl text-secondary">
            Find nightlife, dining, arts, sports, and family events
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Category Filter */}
        <CategoryFilter
          selected={selectedCategory}
          onChange={handleCategoryChange}
          counts={categoryCounts}
        />

        {/* Search Bar */}
        <div className="mt-8 mb-6">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Search events by name or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 bg-card border border-border rounded-full text-lg focus:outline-none focus:border-accent transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">
              🔍
            </div>
          </div>
        </div>

        {/* Results Header */}
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-secondary">
              {events.length} {events.length === 1 ? 'event' : 'events'}
              {selectedCategory && (
                <span className="text-accent font-semibold"> in {selectedCategory}</span>
              )}
              {searchQuery && (
                <span> matching "<span className="text-accent">{searchQuery}</span>"</span>
              )}
            </p>
            {(selectedCategory || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="text-accent hover:text-accent/80 text-sm font-medium flex items-center gap-2"
              >
                <span>✕</span>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.length > 0 ? (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.slice(0, displayCount).map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Load More */}
            {displayCount < events.length && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setDisplayCount(prev => prev + EVENTS_PER_PAGE)}
                  className="px-8 py-4 bg-accent/10 text-accent rounded-full font-semibold hover:bg-accent/20 transition-colors"
                >
                  Load More Events ({events.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">🔍</div>
            <h2 className="text-3xl font-bold mb-3">No events found</h2>
            <p className="text-secondary text-lg mb-6">
              {selectedCategory
                ? `No ${selectedCategory} events available right now`
                : searchQuery
                ? `No events matching "${searchQuery}"`
                : 'No events available right now'}
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-3 bg-accent text-background rounded-full font-semibold hover:bg-accent/90 transition-colors"
            >
              View all events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams
export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}
