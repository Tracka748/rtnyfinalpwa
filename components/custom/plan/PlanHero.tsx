'use client'

export function PlanHero() {
  return (
    <div className="relative overflow-hidden bg-[#121113] pt-8 pb-10 px-4 text-center">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#59ffa0]/5 blur-[80px]" />
        <div className="absolute top-10 left-1/4 w-[200px] h-[200px] rounded-full bg-[#1ac8ed]/5 blur-[60px]" />
        <div className="absolute top-0 right-1/4 w-[180px] h-[180px] rounded-full bg-[#ff6b9d]/5 blur-[60px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#59ffa0]/20 bg-[#59ffa0]/5 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#59ffa0] animate-pulse" />
          <span className="text-[#59ffa0] text-xs font-label tracking-widest">RTNY PLANNING</span>
        </div>

        <h1 className="font-header text-4xl md:text-5xl font-bold text-[#f9fdff] leading-tight mb-3">
          Build Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#59ffa0] via-[#1ac8ed] to-[#ff6b9d]">
            Perfect Event
          </span>
        </h1>

        <p className="font-sans text-[#7DD8E8] text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Tell us what you need and we'll connect you with the best vendors in Rochester, NY.
        </p>
      </div>
    </div>
  )
}
