'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_THEME, type CampaignTheme } from './index'

// Lets deep components (section cards) read the wizard's active theme without
// passing a prop through every step. OfferWizard provides it; outside a provider
// the default (Birthday) theme applies.
const ThemeContext = createContext<CampaignTheme>(DEFAULT_THEME)

export const CampaignThemeProvider = ThemeContext.Provider

export function useCampaignTheme(): CampaignTheme {
  return useContext(ThemeContext)
}
