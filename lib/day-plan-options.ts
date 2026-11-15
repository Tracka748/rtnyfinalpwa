// Plan My Day form options. The single source for the planner UI (PlanMyDay.tsx) and the save
// route's allowlists (lib/day-plan.ts), so the two cannot drift. Pure data: safe on server and client.

export const BUDGET_OPTIONS = [
  { label: 'Under $50',   apiValue: 50   },
  { label: '$50–$100',    apiValue: 100  },
  { label: '$100–$200',   apiValue: 200  },
  { label: '$200+',       apiValue: null }, // no budget cap
]

export const TAGS = [
  { value: 'solo',          icon: '🙋' },
  { value: 'casual',        icon: '😌' },
  { value: 'comfort',       icon: '🛋️' },
  { value: 'recharge',      icon: '🔋' },
  { value: 'social',        icon: '🥂' },
  { value: 'explore',       icon: '🗺️' },
  { value: 'entertainment', icon: '🎭' },
  { value: 'night',         icon: '🌙' },
  { value: 'shopping',      icon: '🛍️' },
  { value: 'food',          icon: '🍽️' },
  { value: 'self-care',     icon: '🌸' },
]

export const ENERGY_OPTIONS = [
  { value: 'relaxed',    label: 'Relaxed',    icon: '🌊' },
  { value: 'active',     label: 'Active',     icon: '⚡' },
  { value: 'family_fun', label: 'Family Fun', icon: '🎠' },
]

export const GROUP_OPTIONS = [
  { value: 'solo',    label: 'Solo',          icon: '🙋' },
  { value: 'couple',  label: 'Couple',        icon: '💑' },
  { value: 'friends', label: 'Friends',       icon: '👥' },
  { value: 'family',  label: 'Parent/Family', icon: '👨‍👩‍👧' },
  { value: 'pet',     label: 'Pet Owner',     icon: '🐾' },
]

export const TRANSPORT_OPTIONS = [
  { value: 'car',       label: 'Driving',    icon: '🚗' },
  { value: 'rideshare', label: 'Rideshare',  icon: '🚕' },
  { value: 'walking',   label: 'Walking',    icon: '🚶' },
]
