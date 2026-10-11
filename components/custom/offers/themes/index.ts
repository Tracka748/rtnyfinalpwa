import type { CampaignTheme } from './types'
import { birthdayTheme } from './birthday'

export type { CampaignTheme, CampaignAssets } from './types'
export { birthdayTheme } from './birthday'

// Registry keyed by occasion (vendor_services.occasions values). To add a theme:
// create themes/<id>.ts exporting a CampaignTheme, then add it here.
export const THEMES: Record<string, CampaignTheme> = {
  [birthdayTheme.id]: birthdayTheme,
}

export const DEFAULT_THEME = birthdayTheme

export function getTheme(occasion: string | null | undefined): CampaignTheme {
  return (occasion && THEMES[occasion.toLowerCase()]) || DEFAULT_THEME
}
