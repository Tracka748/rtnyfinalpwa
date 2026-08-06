export interface Event {
  id: string
  title: string
  category: "nightlife" | "music" | "family" | "movies" | "dining" | "arts" | "sports" | "festivals" | "shopping" | "entertainment"
  image: string
  venue: string
  time: string
  price: string
  points: number
  date: string
  description?: string
  deal?: string
}

export interface PromoCard {
  id: string
  title: string
  subtitle: string
  image?: string
  points: number
  cta: string
  link: string
  isAd?: boolean
  adId?: string
  videoUrl?: string
}

export interface UserBadge {
  id: string
  name: string
  icon: string
  tier: "newcomer" | "explorer" | "night-owl" | "family-hero" | "movie-buff" | "vip"
}

export interface Module {
  id: string
  title: string
  icon: string
  events: Event[]
  priority: number
}
