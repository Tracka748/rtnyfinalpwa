import { GroupSpotlight as GroupSpotlightType } from '@/types/groups'

interface GroupSpotlightProps {
  spotlight: GroupSpotlightType
  accentColor: string
}

export default function GroupSpotlight({ spotlight, accentColor }: GroupSpotlightProps) {
  return (
    <div>
      {/* Section heading */}
      <h2
        className="font-slab-serif font-bold text-xl text-[#F9FDFF] mb-4 pl-3"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        Featured
      </h2>

      {/* Card */}
      <div className="bg-[#1a1a1c] rounded-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          {spotlight.image_url && (
            <div className="w-full md:w-[40%] shrink-0 aspect-[16/9] md:aspect-auto md:min-h-[220px]">
              <img
                src={spotlight.image_url}
                alt={spotlight.subject}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col justify-center gap-3">
            <span
              className="font-label text-xs uppercase tracking-widest font-semibold"
              style={{ color: accentColor }}
            >
              {spotlight.title}
            </span>

            <h3 className="font-slab-serif text-2xl md:text-3xl font-bold text-white leading-tight">
              {spotlight.subject}
            </h3>

            {spotlight.description && (
              <p className="font-sans text-sm text-[#c8d8dc] leading-relaxed line-clamp-3">
                {spotlight.description}
              </p>
            )}

            {spotlight.link_url && (
              <a
                href={spotlight.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-label text-xs uppercase tracking-widest font-semibold mt-1 w-fit"
                style={{ color: accentColor }}
              >
                Learn More →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
