export const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=800&fit=crop"

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  nightlife: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=800&fit=crop",
  music: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=800&fit=crop",
  family: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=800&fit=crop",
  dining: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=800&fit=crop",
  movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=800&fit=crop",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=800&fit=crop",
  arts: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&h=800&fit=crop",
  festivals: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=800&fit=crop",
  default: DEFAULT_EVENT_IMAGE,
}

export function getEventImage(imageUrl: string | null | undefined, category: string | null | undefined): string {
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) return imageUrl
  return CATEGORY_PLACEHOLDERS[category?.toLowerCase() || ""] || CATEGORY_PLACEHOLDERS.default
}
