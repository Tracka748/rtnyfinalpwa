export function ContextualAd() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <a href="#" className="relative block w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16/5" }}>
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=375&fit=crop"
          alt="Advertisement"
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/70 px-1 rounded">
          Sponsored
        </span>
      </a>
    </div>
  )
}
