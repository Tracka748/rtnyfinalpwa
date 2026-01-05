import type { UserBadge } from "./types"

interface ModulePriorityItem {
  id: string
  title: string
  priority: number
  badge?: string | null
  timeBoost?: number
  dayBoost?: number
  requiresLogin?: boolean
  minPoints?: number
}

export function getModulePriority(
  badges: UserBadge[],
  currentHour: number,
  isWeekend: boolean,
  userPoints = 0,
  isLoggedIn = false,
): ModulePriorityItem[] {
  const currentDay = new Date().getDay()
  const isThursdayToSunday = [4, 5, 6, 0].includes(currentDay)

  const modules: ModulePriorityItem[] = [
    {
      id: "tonight",
      title: "Tonight in Rochester",
      priority: 5,
      badge: "night-owl",
      timeBoost: currentHour >= 17 ? 10 : 0,
    },
    {
      id: "family",
      title: "Family Weekend",
      priority: 3,
      badge: "family",
      dayBoost: isWeekend ? 8 : 0,
    },
    {
      id: "movies",
      title: "Movies This Week",
      priority: 4,
      badge: "movie-buff",
      dayBoost: isThursdayToSunday ? 5 : 0,
    },
    {
      id: "plan-day",
      title: "Plan My Day",
      priority: 2,
      timeBoost: currentHour < 17 ? 7 : 0,
    },
    {
      id: "vip",
      title: "VIP Perks",
      priority: 1,
      requiresLogin: true,
      minPoints: 500,
    },
    {
      id: "music",
      title: "Live Music",
      priority: 4,
      badge: "music-lover",
      timeBoost: currentHour >= 17 ? 5 : 0,
      dayBoost: isWeekend ? 5 : 0,
    },
    {
      id: "happy-hours",
      title: "Happy Hours",
      priority: 3,
      badge: "social",
      timeBoost: currentHour >= 15 && currentHour <= 19 ? 10 : 0,
    },
  ]

  // Apply badge boosts
  modules.forEach((module) => {
    if (module.badge && badges.some((b) => b.id === module.badge)) {
      module.priority += 10
    }
  })

  // Apply time/day boosts
  modules.forEach((module) => {
    module.priority += (module.timeBoost || 0) + (module.dayBoost || 0)
  })

  // Filter modules based on requirements
  const filteredModules = modules
    .filter((m) => !m.requiresLogin || isLoggedIn)
    .filter((m) => !m.minPoints || userPoints >= m.minPoints)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5) // Show top 5 modules

  return filteredModules
}
