import { Button } from "@/components/ui/button"

export function ContextualAd() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl border border-accent-secondary/30 bg-gradient-to-br from-surface to-surface-elevated p-6 md:p-8">
        {/* Sponsored label */}
        <div className="absolute right-4 top-4 text-xs text-text-muted">Sponsored</div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="text-2xl">🎨</div>
              <h3 className="text-lg font-bold text-text-primary">Rochester Museum</h3>
            </div>
            <p className="mb-1 text-xl font-semibold text-text-primary">Kids Free Sunday + Earn 200 pts</p>
            <p className="text-sm text-text-secondary">Valid Dec 15 • 10AM-5PM</p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-accent-secondary text-background hover:bg-accent-secondary/90">
              Get Free Tickets
            </Button>
            <Button
              variant="outline"
              className="border-accent-secondary text-accent-secondary hover:bg-accent-secondary/10 bg-transparent"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
