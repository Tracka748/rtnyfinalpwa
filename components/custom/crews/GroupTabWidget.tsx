interface GroupTabWidgetProps {
  totalSpend: number
  loading?: boolean
}

export function GroupTabWidget({ totalSpend, loading }: GroupTabWidgetProps) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <p className="font-label text-xs uppercase tracking-widest text-foreground/40 mb-1">
        Crew Spent
      </p>
      {loading ? (
        <div className="h-7 w-24 rounded-md bg-white/5 animate-pulse" />
      ) : totalSpend > 0 ? (
        <p className="font-slab-serif text-accent text-xl">
          ${totalSpend.toFixed(2)}
        </p>
      ) : (
        <p className="font-slab-serif text-foreground/30 text-xl">$0.00</p>
      )}
    </div>
  )
}
