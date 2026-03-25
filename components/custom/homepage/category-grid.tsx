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
    <div className="bg-white/[0.02] rounded-2xl mx-4 px-4 py-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-header text-xl font-bold text-white">🧭 Explore More</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-3">
        {categories.map((category) => (
          <button
            key={category.id}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-surface p-4 transition-all hover:bg-surface-elevated"
          >
            <span className="text-2xl">{category.icon}</span>
            <span className="text-xs font-semibold text-text-primary">{category.label}</span>
            <span className="text-[10px] text-[#7DD8E8]">{category.count} tonight</span>
          </button>
        ))}
      </div>
    </div>
  )
}
