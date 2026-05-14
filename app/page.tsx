"use client"

import { useState, useEffect, useRef } from "react"
import { CuratedPlanCard, type CuratedPlan } from "@/components/custom/plan/CuratedPlanCard"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { HomepageSearchBar } from "@/components/custom/homepage/search-bar"
import { HeroPromo } from "@/components/custom/homepage/hero-promo"
import { DateTabs } from "@/components/custom/homepage/date-tabs"
import { FeaturedEvents } from "@/components/custom/homepage/featured-events"
import { AnnouncementStrip } from "@/components/custom/homepage/announcement-strip"
import { TonightSection } from "@/components/custom/homepage/tonight-section"
import { ModuleSection } from "@/components/custom/homepage/module-section"
import { ContextualAd } from "@/components/custom/homepage/contextual-ad"
import { CategoryGrid } from "@/components/custom/homepage/category-grid"
import { PointsFeedback } from "@/components/custom/homepage/points-feedback"
import { Footer } from "@/components/custom/homepage/footer"
import { HomepageCrewModule } from "@/components/custom/crews/HomepageCrewModule"
import { HostedPlanCards } from "@/components/custom/plan/hosted-plan-cards"
import { ThisWeekRochester } from "@/components/custom/events/this-week-rochester"
import { FeaturedAdBanner } from "@/components/custom/ads/featured-ad-banner"
import RewardStatusBar from "@/components/rewards/RewardStatusBar"
import { getModulePriority } from "@/lib/homepage/get-module-priority"
import { getEventImage } from "@/lib/image-utils"
import type { Event, PromoCard, Module } from "@/lib/homepage/types"

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [curatedPlans, setCuratedPlans] = useState<CuratedPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<CuratedPlan | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [mobilePage, setMobilePage] = useState(0)
  const touchStartX = useRef(0)

  // Fetch events from API
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/v1/events')
        const result = await response.json()

        if (result.success && result.data) {
          setAllEvents(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      }
    }

    fetchEvents()
  }, [])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase
      .from('curated_plans')
      .select('*')
      .eq('active', true)
      .order('is_featured', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setCuratedPlans(data)
      })
  }, [])

  // Helper function to map API event to Event type
  const mapEventToEventType = (apiEvent: any): Event => {
    const lowestPrice = apiEvent.ticket_types?.[0]?.price || 0
    const category = apiEvent.category || "nightlife"
    return {
      id: apiEvent.id,
      title: apiEvent.name,
      category: category,
      image: getEventImage(apiEvent.flyer_image_url || apiEvent.image_url, category),
      venue: apiEvent.venue_name || "TBA",
      time: new Date(apiEvent.event_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      price: lowestPrice > 0 ? `$${lowestPrice}` : "Free",
      points: Math.floor(lowestPrice * 5) || 50,
      date: new Date(apiEvent.event_date).toISOString().split("T")[0],
    }
  }

  // Deduplicate API events by ID to prevent triple-rendering from API duplicates
  const uniqueEvents = [...new Map(allEvents.map(e => [e.id, e])).values()]

  // Filter featured events (featured=true, limit 10)
  const featuredEvents: Event[] = uniqueEvents
    .filter(event => event.featured === true)
    .slice(0, 10)
    .map(mapEventToEventType)

  // Filter tonight events (events in the next 24 hours)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const tonightEvents: Event[] = uniqueEvents
    .filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate >= now && eventDate < tomorrow
    })
    .map(mapEventToEventType)

  // Mock user data for PointsFeedback
  const userData = {
    isLoggedIn: true,
    points: 1240,
    badges: [{ id: "explorer", name: "Explorer", icon: "🏅", tier: "explorer" as const }],
  }

  // Mock promo data
  const promos: PromoCard[] = [
    {
      id: "1",
      title: "🎬 Free Kids Movies Weekend",
      subtitle: "Dec 15-20 • All Rochester Theaters",
      image: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_35_56%20AM.png",
      points: 300,
      cta: "View Showtimes",
      link: "/movies",
    },
    {
      id: "2",
      title: "🎸 Rochester Music Festival",
      subtitle: "Live bands every night • Downtown venues",
      image: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_36_16%20AM.png",
      points: 500,
      cta: "Get Tickets",
      link: "/festivals",
    },
    {
      id: "3",
      title: "🍹 Holiday Food & Wine Walk",
      subtitle: "Taste Rochester • Over 25 restaurants",
      image: "https://uxpmfnbifhkayljayjtb.supabase.co/storage/v1/object/public/Hosted-plan-covers/ChatGPT%20Image%20May%209,%202026,%2010_36_29%20AM.png",
      points: 250,
      cta: "Reserve Spot",
      link: "/dining",
    },
  ]

  const currentHour = new Date().getHours()
  const isWeekend = [0, 6].includes(new Date().getDay())
  const moduleOrder = getModulePriority(userData.badges, currentHour, isWeekend, userData.points, userData.isLoggedIn)

  const tonightDeals: Event[] = [
    {
      id: "d1",
      title: "HAPPY HOUR",
      category: "dining",
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=800&fit=crop",
      venue: "5-7PM",
      time: "All Bars",
      price: "Specials",
      points: 100,
      date: selectedDate,
    },
    {
      id: "d2",
      title: "2-FOR-1 DRINKS",
      category: "dining",
      image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=800&fit=crop",
      venue: "Bug Jar",
      time: "All Night",
      price: "$10",
      points: 50,
      date: selectedDate,
    },
    {
      id: "d3",
      title: "LADIES NIGHT",
      category: "nightlife",
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=800&fit=crop",
      venue: "Lux Club",
      time: "Free Before 10PM",
      price: "$0",
      points: 75,
      date: selectedDate,
    },
    {
      id: "d4",
      title: "VIP BOTTLE SERVICE",
      category: "nightlife",
      image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&h=800&fit=crop",
      venue: "All Venues",
      time: "Reserve Now",
      price: "$250",
      points: 250,
      date: selectedDate,
    },
  ]

  const modules: Module[] = [
    {
      id: "family",
      title: "Family Weekend",
      icon: "👨‍👩‍👧",
      priority: 0,
      events: [
        {
          id: "f1",
          title: "Zoo Day",
          category: "family",
          image: "/zoo-animals-family-kids.jpg",
          venue: "Seneca Zoo",
          time: "Sat • 10AM",
          price: "$15",
          points: 75,
          date: selectedDate,
        },
        {
          id: "f2",
          title: "Museum Free Sunday",
          category: "family",
          image: "/museum-kids-exhibits.jpg",
          venue: "Strong Museum",
          time: "Sun • 12PM",
          price: "$10",
          points: 50,
          date: selectedDate,
        },
        {
          id: "f3",
          title: "Park Festival",
          category: "family",
          image: "/park-festival-family-fun.jpg",
          venue: "Highland Park",
          time: "Sat • 11AM",
          price: "Free",
          points: 25,
          date: selectedDate,
        },
        {
          id: "f4",
          title: "Aquarium Visit",
          category: "family",
          image: "/aquarium-fish-kids.jpg",
          venue: "Seabreeze",
          time: "Sun • 1PM",
          price: "$20",
          points: 100,
          date: selectedDate,
        },
      ],
    },
    {
      id: "movies",
      title: "Movies This Week",
      icon: "🎬",
      priority: 0,
      events: [
        {
          id: "m1",
          title: "Wicked",
          category: "movies",
          image: "/wicked-musical-theater-movie.jpg",
          venue: "Little Theatre",
          time: "7:30 PM",
          price: "$25",
          points: 150,
          date: selectedDate,
        },
        {
          id: "m2",
          title: "Gladiator II",
          category: "movies",
          image: "/gladiator-action-sequel.jpg",
          venue: "Regal Henrietta",
          time: "7:00 PM",
          price: "$14",
          points: 85,
          date: selectedDate,
        },
        {
          id: "m3",
          title: "The Wild Robot",
          category: "movies",
          image: "/wild-robot-animated-film.jpg",
          venue: "AMC Webster",
          time: "2:00 PM",
          price: "$12",
          points: 75,
          date: selectedDate,
        },
        {
          id: "m4",
          title: "Nosferatu",
          category: "movies",
          image: "/nosferatu-horror-vampire.jpg",
          venue: "Little Theatre",
          time: "9:00 PM",
          price: "$18",
          points: 90,
          date: selectedDate,
        },
      ],
    },
    {
      id: "music",
      title: "Live Music",
      icon: "🎸",
      priority: 0,
      events: [
        {
          id: "mu1",
          title: "Jazz Night",
          category: "music",
          image: "/jazz-live-band-saxophone.jpg",
          venue: "Old Toad",
          time: "8:00 PM",
          price: "$15",
          points: 80,
          date: selectedDate,
        },
        {
          id: "mu2",
          title: "Rock Concert",
          category: "music",
          image: "/rock-concert-guitar-band.jpg",
          venue: "Anthology",
          time: "9:00 PM",
          price: "$30",
          points: 150,
          date: selectedDate,
        },
        {
          id: "mu3",
          title: "Open Mic Night",
          category: "music",
          image: "/open-mic-acoustic-guitar.jpg",
          venue: "Java's",
          time: "7:00 PM",
          price: "Free",
          points: 40,
          date: selectedDate,
        },
      ],
    },
    {
      id: "plan-day",
      title: "Plan My Day",
      icon: "☀️",
      priority: 0,
      events: [
        {
          id: "pd1",
          title: "Brunch Specials",
          category: "dining",
          image: "/brunch-food-breakfast.jpg",
          venue: "Good Luck",
          time: "11:00 AM",
          price: "$25",
          points: 100,
          date: selectedDate,
        },
        {
          id: "pd2",
          title: "Coffee & Pastries",
          category: "dining",
          image: "/coffee-pastries-cafe.jpg",
          venue: "Java's",
          time: "8:00 AM",
          price: "$8",
          points: 30,
          date: selectedDate,
        },
        {
          id: "pd3",
          title: "Shopping Downtown",
          category: "shopping",
          image: "/shopping-downtown-stores.jpg",
          venue: "East Ave",
          time: "10:00 AM",
          price: "Free",
          points: 20,
          date: selectedDate,
        },
      ],
    },
  ]

  // Sort modules by priority
  const sortedModules = modules
    .filter((module) => moduleOrder.some((m) => m.id === module.id))
    .map((module) => ({
      ...module,
      priority: moduleOrder.find((m) => m.id === module.id)?.priority || 0,
    }))
    .sort((a, b) => b.priority - a.priority)

  const musicModule = modules.find(m => m.id === 'music')
  const moviesModule = modules.find(m => m.id === 'movies')
  const familyModule = modules.find(m => m.id === 'family')

  return (
    <div className="min-h-screen bg-background divide-y divide-white/5">
      {/* Search Bar (sticky below nav) */}
      <HomepageSearchBar />

      {/* Section 1: Hero Promo */}
      <HeroPromo promos={promos} />

      {/* Section 2: Date Tabs */}
      <DateTabs onDateChange={setSelectedDate} />

      {/* Reward Status Bar */}
      <RewardStatusBar points={240} stubs={2} stubsTarget={3} badgeCount={4} giftCount={1} />

      {/* Section 3: Popular in Rochester */}
      <FeaturedEvents events={featuredEvents} />

      {/* Section 4: Live Music */}
      {musicModule && <ModuleSection module={musicModule} />}

      {/* Section 5: Deals & Promos */}
      <AnnouncementStrip
        icon="🎊"
        title="NEW YEAR'S EVE"
        subtitle="50+ Events Live Now"
        highlight="Earn 500 bonus points"
        ctaText="View All Events"
        ctaLink="/nye"
      />

      {/* Section 6: This Week in Rochester */}
      <ThisWeekRochester />

      {/* Featured Ad Banner */}
      <FeaturedAdBanner />

      {/* Section 7: Hosted Plan Cards */}
      <HostedPlanCards />

      {/* Section 8: Plan Your Day grid */}
      {curatedPlans.length > 0 && (
        <section className="mt-8 bg-[#080808] py-8">
          <div className="flex items-center justify-between mb-4 px-4">
            <div>
              <h2 className="font-slab-serif font-bold text-2xl text-foreground">
                ✨ Plan Your Day
              </h2>
              <p className="text-sm text-foreground/40 mt-0.5">
                Curated Rochester experiences — tap to customize
              </p>
            </div>
            <a href="/plan" className="text-xs text-accent hover:underline shrink-0">
              Build Your Own →
            </a>
          </div>
          {/* Mobile: 3×2 grid, 6 cards per page */}
          <div className="md:hidden px-4">
            <div
              className="grid grid-cols-3 grid-rows-2 gap-4"
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
              onTouchEnd={(e) => {
                const delta = touchStartX.current - e.changedTouches[0].clientX
                const totalPages = Math.ceil(curatedPlans.length / 6)
                if (delta > 50 && mobilePage < totalPages - 1) setMobilePage(p => p + 1)
                if (delta < -50 && mobilePage > 0) setMobilePage(p => p - 1)
              }}
            >
              {curatedPlans.slice(mobilePage * 6, mobilePage * 6 + 6).map((plan) => (
                <CuratedPlanCard
                  key={plan.id}
                  plan={plan}
                  mobile
                  onUseThisPlan={(plan) => {
                    setSelectedPlan(plan)
                    setSheetOpen(true)
                  }}
                />
              ))}
            </div>
            {Math.ceil(curatedPlans.length / 6) > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: Math.ceil(curatedPlans.length / 6) }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to page ${i + 1}`}
                    onClick={() => setMobilePage(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      mobilePage === i ? 'bg-accent w-6' : 'bg-white/20 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop: original 3-card carousel */}
          <div className="hidden md:block px-4">
            <div className="relative">
              {/* Left Arrow */}
              <button
                type="button"
                aria-label="Previous plans"
                onClick={() => setCarouselIndex(i => Math.max(0, i - 3))}
                disabled={carouselIndex === 0}
                className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-xl text-foreground hover:border-accent hover:text-accent transition disabled:opacity-20 disabled:cursor-not-allowed"
              >←</button>

              {/* 3 Cards */}
              <div className="grid grid-cols-3 gap-4">
                {curatedPlans.slice(carouselIndex, carouselIndex + 3).map((plan) => (
                  <CuratedPlanCard
                    key={plan.id}
                    plan={plan}
                    onUseThisPlan={(plan) => {
                      setSelectedPlan(plan)
                      setSheetOpen(true)
                    }}
                  />
                ))}
              </div>

              {/* Right Arrow */}
              <button
                type="button"
                aria-label="Next plans"
                onClick={() => setCarouselIndex(i => Math.min(curatedPlans.length - 3, i + 3))}
                disabled={carouselIndex + 3 >= curatedPlans.length}
                className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-white/10 flex items-center justify-center text-xl text-foreground hover:border-accent hover:text-accent transition disabled:opacity-20 disabled:cursor-not-allowed"
              >→</button>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-5">
              {Array.from({ length: Math.ceil(curatedPlans.length / 3) }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to page ${i + 1}`}
                  onClick={() => setCarouselIndex(i * 3)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    Math.floor(carouselIndex / 3) === i ? 'bg-accent w-6' : 'bg-white/20 w-1.5'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 9: Your Crew */}
      <section className="px-4 py-6">
        <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-3">Your Crew</p>
        <HomepageCrewModule />
      </section>

      {/* Section 10: RTNY Merch */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-header text-2xl font-bold text-foreground">
              🛍️ RTNY Merch
            </h2>
            <button type="button" className="text-accent hover:text-accent/80 font-sans text-sm">
              Shop All →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Product 1: T-Shirt */}
            <div className="group cursor-pointer rounded-xl overflow-hidden bg-surface/50 hover:bg-surface transition-colors">
              <div className="aspect-square overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"
                  alt="RTNY Logo T-Shirt"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <h3 className="font-sans font-medium text-foreground text-sm mb-1">
                  RTNY Logo Tee
                </h3>
                <p className="font-serif text-accent">
                  $25
                </p>
              </div>
            </div>

            {/* Product 2: Hoodie */}
            <div className="group cursor-pointer rounded-xl overflow-hidden bg-surface/50 hover:bg-surface transition-colors">
              <div className="aspect-square overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
                  alt="RTNY Hoodie"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <h3 className="font-sans font-medium text-foreground text-sm mb-1">
                  RTNY Hoodie
                </h3>
                <p className="font-serif text-accent">
                  $45
                </p>
              </div>
            </div>

            {/* Product 3: Hat */}
            <div className="group cursor-pointer rounded-xl overflow-hidden bg-surface/50 hover:bg-surface transition-colors">
              <div className="aspect-square overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop"
                  alt="RTNY Hat"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <h3 className="font-sans font-medium text-foreground text-sm mb-1">
                  RTNY Hat
                </h3>
                <p className="font-serif text-accent">
                  $20
                </p>
              </div>
            </div>

            {/* Product 4: Sticker Pack */}
            <div className="group cursor-pointer rounded-xl overflow-hidden bg-surface/50 hover:bg-surface transition-colors">
              <div className="aspect-square overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1611532736579-6b16e2b50449?w=400&h=400&fit=crop"
                  alt="RTNY Sticker Pack"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <h3 className="font-sans font-medium text-foreground text-sm mb-1">
                  Sticker Pack
                </h3>
                <p className="font-serif text-accent">
                  $10
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 11: Movies This Week */}
      {moviesModule && <ModuleSection module={moviesModule} />}

      {/* Section 12: Family Weekend */}
      {familyModule && <ModuleSection module={familyModule} />}

      {/* Contextual Ad */}
      <ContextualAd />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Points Feedback */}
      {userData.isLoggedIn && (
        <PointsFeedback points={userData.points} currentBadge="Explorer" nextBadge="Night Owl" progress={70} />
      )}

      {/* Footer */}
      <Footer />

      {/* Curated plan bottom sheet */}
      {sheetOpen && selectedPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full bg-background rounded-t-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-foreground font-bold text-lg">{selectedPlan.title}</p>
            <p className="text-foreground/40 text-sm mt-1">Bottom sheet coming soon</p>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-4 w-full py-3 rounded-xl bg-accent text-background font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
