// Launch feature flags. Each defaults to OFF: a feature is enabled only when its
// env var is exactly 'true'. NEXT_PUBLIC_ vars are inlined at build time, so
// changing one needs a rebuild/redeploy to take effect.

// Promo codes: customer entry at checkout, promoter create/edit, and the
// validate/auto-apply endpoints.
export function promoCodesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PROMO_CODES_ENABLED === 'true'
}
