// components/custom/events/event-card-skeleton.tsx
export function EventCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <div className="aspect-[3/4] bg-secondary/10 animate-pulse" />
    </div>
  );
}