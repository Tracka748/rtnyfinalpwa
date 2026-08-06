"use client"

import { useState, useEffect } from "react"
import { HomepageSearchBar } from "@/components/custom/homepage/search-bar"
import { HeroPromo } from "@/components/custom/homepage/hero-promo"
import { DateTabs } from "@/components/custom/homepage/date-tabs"
import { FeaturedEvents } from "@/components/custom/homepage/featured-events"
import { AnnouncementStrip } from "@/components/custom/homepage/announcement-strip"
import { ModuleSection } from "@/components/custom/homepage/module-section"
import { ContextualAd } from "@/components/custom/homepage/contextual-ad"
import { ExploreCategoriesGrid } from "@/components/custom/homepage/ExploreCategoriesGrid"
import { PointsFeedback } from "@/components/custom/homepage/points-feedback"
import { Footer } from "@/components/custom/homepage/footer"
// {/* HIDDEN: HomepageCrewModule — moved to /crews nav route */}
// {/* HIDDEN: HostedPlanCards — part of Plan Your Day, moved to /plan nav route */}
import { LiveNowSection } from "@/components/custom/events/LiveNowSection"
import { AnnouncementFeed } from "@/components/custom/homepage/announcement-feed"
import { FeaturedAdBanner } from "@/components/custom/ads/featured-ad-banner"
import RewardStatusBar from "@/components/rewards/RewardStatusBar"
import { getModulePriority } from "@/lib/homepage/get-module-priority"
import type { Event, PromoCard, Module } from "@/lib/homepage/types"
import RTNYPicksSection from "@/components/custom/homepage/RTNYPicksSection"
import { DiscoveryModule } from "@/components/custom/homepage/discovery-module"
import PlanYourDayCard from "@/components/plan/PlanYourDayCard"
import { PersonalizedRow } from "@/components/custom/homepage/personalized-row"
import SweepstakesSection from "@/components/custom/homepage/SweepstakesSection"
import PartnerAdsSection from "@/components/custom/homepage/PartnerAdsSection"
import RochesterSportsSection from "@/components/custom/homepage/RochesterSportsSection"
import GetActiveSection from "@/components/custom/homepage/GetActiveSection"

interface PlacementAd {
  id: string
  title: string
  image_url: string
  link_url: string | null
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [homepageEvents, setHomepageEvents] = useState<Record<string, Event[]>>({})
  const [liveNowBannerAd, setLiveNowBannerAd] = useState<PlacementAd | null>(null)

  useEffect(() => {
    async function fetchHomepageEvents() {
      try {
        const response = await fetch('/api/v1/events/homepage')
        const result = await response.json()
        if (result.success && result.data) {
          setHomepageEvents(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch homepage events:', error)
      }
    }
    fetchHomepageEvents()
  }, [])

  useEffect(() => {
    async function fetchLiveNowBannerAd() {
      try {
        const response = await fetch('/api/v1/ads?placement=live_now_banner')
        const result = await response.json()
        if (result.ad) {
          setLiveNowBannerAd(result.ad)
        }
      } catch (error) {
        console.error('Failed to fetch live_now_banner ad:', error)
      }
    }
    fetchLiveNowBannerAd()
  }, [])

  const featuredEvents: Event[] = homepageEvents.nightlife ?? []

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

  const [heroAd, setHeroAd] = useState<PromoCard | null>(null)
  const [heroAdPosition, setHeroAdPosition] = useState<number | null>(null)

  useEffect(() => {
    async function fetchHeroAd() {
      try {
        const response = await fetch('/api/v1/ads?placement=hero_carousel')
        const result = await response.json()
        if (result.ad) {
          setHeroAd({
            id: result.ad.id,
            title: result.ad.title,
            subtitle: '',
            image: result.ad.ad_type === 'reel' ? undefined : result.ad.image_url,
            videoUrl: result.ad.ad_type === 'reel' ? result.ad.video_url : undefined,
            points: 0,
            cta: 'Learn More',
            link: result.ad.link_url || '#',
            isAd: true,
            adId: result.ad.id,
          })
          setHeroAdPosition(Math.floor(Math.random() * (promos.length + 1)))
        }
      } catch (error) {
        console.error('Failed to fetch hero carousel ad:', error)
      }
    }
    fetchHeroAd()
  }, [])

  const heroPromos =
    heroAd && heroAdPosition !== null
      ? [...promos.slice(0, heroAdPosition), heroAd, ...promos.slice(heroAdPosition)]
      : promos

  const currentHour = new Date().getHours()
  const isWeekend = [0, 6].includes(new Date().getDay())
  const moduleOrder = getModulePriority(userData.badges, currentHour, isWeekend, userData.points, userData.isLoggedIn)

  const tonightDeals: Event[] = homepageEvents.dining ?? []

  const modules: Module[] = [
    {
      id: "family",
      title: "Family Life",
      icon: "👨‍👩‍👧",
      priority: 0,
      events: homepageEvents.family ?? [],
    },
    {
      id: "movies",
      title: "Movies This Week",
      icon: "🎬",
      priority: 0,
      events: homepageEvents.movies ?? [],
    },
    {
      id: "music",
      title: "Live Music",
      icon: "🎸",
      priority: 0,
      events: homepageEvents.music ?? [],
    },
    {
      id: "plan-day",
      title: "Plan My Day",
      icon: "☀️",
      priority: 0,
      events: homepageEvents.dining ?? [],
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
      <HeroPromo promos={heroPromos} />

      {/* Section 2: Date Tabs */}
      <DateTabs onDateChange={setSelectedDate} />

      {/* Reward Status Bar */}
      <RewardStatusBar points={240} stubs={2} stubsTarget={3} badgeCount={4} giftCount={1} />

      {/* What's Happening feed */}
      <AnnouncementFeed />

      {/* Live Now: today's active events */}
      <LiveNowSection />

      {/* Section 3: Popular in Rochester */}
      <FeaturedEvents events={featuredEvents} />

      {/* Personalized / Popular row */}
      <PersonalizedRow />

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
        ad={liveNowBannerAd ?? undefined}
      />

      {/* Discovery Module */}
      <DiscoveryModule />

      {/* Plan Your Day */}
      <PlanYourDayCard />

      {/* Featured Ad Banner */}
      <FeaturedAdBanner />

      {/* Rochester Sports */}
      <RochesterSportsSection events={homepageEvents.sports ?? []} />

      {/* Get Active */}
      <GetActiveSection />

      {/* Family Life */}
      {familyModule && <ModuleSection module={familyModule} />}

      {/* RTNY Picks */}
      <section className="w-full px-0 py-6">
        <RTNYPicksSection />
      </section>

      {/* Sweepstakes */}
      <section className="w-full px-0 py-6">
        <SweepstakesSection />
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

      {/* Partner Ads */}
      <section className="w-full px-0 py-6">
        <PartnerAdsSection />
      </section>

      {/* HIDDEN: HostedPlanCards — part of Plan Your Day, moved to /plan nav route */}

      {/* HIDDEN: HomepageCrewModule — moved to /crews nav route */}

      {/* Contextual Ad */}
      <ContextualAd />

      {/* Category Grid */}
      <ExploreCategoriesGrid />

      {/* Points Feedback */}
      {userData.isLoggedIn && (
        <PointsFeedback points={userData.points} currentBadge="Explorer" nextBadge="Night Owl" progress={70} />
      )}

      {/* Footer */}
      <Footer />

    </div>
  )
}
