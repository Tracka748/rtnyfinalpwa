import type { CampaignTheme } from './types'

const base = '/campaigns/birthday'

// Contrast on #121113: accent #FF6FB5 ~7.3:1, accent2 #A8DCFF ~13:1.
export const birthdayTheme: CampaignTheme = {
  id: 'birthday',
  name: 'Birthday',
  accent: '#FF6FB5',
  accent2: '#A8DCFF',
  eyebrow: 'RTNY · BIRTHDAY PARTNER',
  welcome: {
    highlight: 'Birthday',
  },
  success: {
    statusLabel: 'Submitted for review',
  },
  assets: {
    welcome: `${base}/welcome.webp`,
    success: `${base}/success.webp`,
    hat: `${base}/hat.webp`,
    divider: `${base}/divider.webp`,
    confetti: `${base}/confetti.webp`,
    balloons: `${base}/balloons.webp`,
    headerBackdrop: `${base}/header-backdrop.webp`,
  },
  sprinkles: ['#FF6FB5', '#A8DCFF', '#59FFA0', '#F9FDFF'],
}
