export function CategoryGrid() {
  const categories = [
    { id: "nightlife", icon: "🎉", label: "Nightlife", count: 12 },
    { id: "music", icon: "🎸", label: "Music", count: 8 },
    { id: "dining", icon: "🍹", label: "Dining", count: 24 },
    { id: "arts", icon: "🎨", label: "Arts", count: 6 },
    { id: "sports", icon: "🏃", label: "Sports", count: 4 },
    { id: "family", icon: "👨‍👩‍👧", label: "Family", count: 15 },
    { id: "movies", icon: "🎬", label: "Movies", count: 18 },
    { id: "festivals", icon: "✨", label: "Events", count: 5 },
    { id: "perks", icon: "🎟️", label: "Perks", count: 3 },
  ]

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <h2 className="mb-4 text-lg font-bold text-text-primary">Explore More</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {categories.map((category) => (
          <button
            key={category.id}
            className="flex flex-col items-center justify-center gap-2 rounded-xl bg-surface p-6 transition-all hover:border-accent-secondary hover:bg-surface-elevated hover:shadow-lg hover:shadow-accent-secondary/20"
          >
            <span className="text-4xl">{category.icon}</span>
            <span className="text-sm font-semibold text-text-primary">{category.label}</span>
            <span className="text-xs text-text-muted">{category.count} tonight</span>
          </button>
        ))}
      </div>
    </div>
  )
}
