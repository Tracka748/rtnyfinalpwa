// A campaign theme skins the offer wizard for one occasion (Birthday first).
// Themes only decorate the welcome step, step headers, review preview and the
// success screen. Form controls, the primary button (mint #59FFA0) and the page
// background (#121113) are the same on every theme.

export interface CampaignAssets {
  // Optional WebP files under public/campaigns/<id>/. Each has an inline SVG
  // fallback, so a theme renders correctly before any file is added.
  welcome: string
  success: string
  cake: string
  divider: string
  confetti: string
  balloons: string
  headerBackdrop: string
  // Optional lettering art for the two hero moments (GraffitiHeader image mode).
  titleWelcome: string
  titleSuccess: string
}

export interface GraffitiColors {
  // Title lettering. Must be >= 4.5:1 on #121113.
  text: string
  // Hand-drawn underline stroke.
  underline: string
  // Soft splatter glow behind the title.
  splatter: string
}

export interface CampaignTheme {
  id: string
  name: string
  // Decorative highlight (headline word, eyebrow, status line). Must be >= 4.5:1 on #121113.
  accent: string
  // Secondary decoration (glow, gradient edge, sprinkles).
  accent2: string
  // Eyebrow shown in theme headers, e.g. "RTNY · BIRTHDAY PARTNER".
  eyebrow: string
  welcome: {
    // Word in the welcome headline drawn in the accent color.
    highlight: string
  }
  success: {
    // Status line above the success headline, drawn in the accent color.
    statusLabel: string
  }
  assets: CampaignAssets
  // Sprinkle colors, cycled in order.
  sprinkles: string[]
  // GraffitiHeader colors and the hero/section titles it shows.
  graffiti: GraffitiColors
  titles: {
    welcome: string
    success: string
    review: string
  }
}
