// Emoji shown in a business avatar slot when the business has no uploaded logo.
// Shared by the Plan My Day stop card and the dashboard's saved-plan rows.

export const AVATAR_EMOJI: Record<string, string> = {
  activity:      '🎯',
  food:          '🍽️',
  shopping:      '🛍️',
  entertainment: '🎭',
  cafe:          '☕',
  bar:           '🍸',
  self_care:     '💆',
}

export const AVATAR_FALLBACK = '📍'

export function getAvatarEmoji(category: string | null | undefined): string {
  const lower = typeof category === 'string' ? category.toLowerCase() : ''
  for (const [key, emoji] of Object.entries(AVATAR_EMOJI)) {
    if (lower.includes(key)) return emoji
  }
  return AVATAR_FALLBACK
}
