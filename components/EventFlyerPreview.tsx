'use client';

interface EventFlyerProps {
  backgroundUrl: string;
  eventName: string;
  date: string;
  venue: string;
  ticketPrice: string | number;
  category: string;
}

export function EventFlyerPreview({
  backgroundUrl,
  eventName,
  date,
  venue,
  ticketPrice,
  category,
}: EventFlyerProps) {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-[9/16] overflow-hidden rounded-xl shadow-2xl bg-[#121113]">
      {/* AI-Generated Background */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt="Event background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay Gradient for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />

      {/* TOP: Event Title (30% space) */}
      <div className="absolute top-0 left-0 right-0 p-8 text-center">
        <div className="inline-block px-3 py-1 bg-[#59FFA0]/20 border border-[#59FFA0]/50 rounded-full mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-[#59FFA0]">
            {category}
          </span>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl leading-tight">
          {eventName || 'Event Name'}
        </h1>

        <p className="text-xl text-[#59FFA0] font-medium drop-shadow-lg">
          {date || 'Date TBD'}
        </p>
      </div>

      {/* BOTTOM: Event Info (20% space) */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Location
              </p>
              <p className="text-lg text-white font-medium truncate">
                {venue || 'Venue TBD'}
              </p>
            </div>

            <div className="text-right ml-4 shrink-0">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                From
              </p>
              <p className="text-3xl text-[#59FFA0] font-bold">
                ${ticketPrice}
              </p>
            </div>
          </div>

          <div className="w-full py-4 bg-gradient-to-r from-[#59FFA0] to-[#1AC8ED] text-black font-bold rounded-xl text-center shadow-lg">
            Get Tickets
          </div>
        </div>

        {/* RTNY Branding */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500">Powered by</span>
          <span className="text-sm font-bold text-[#59FFA0]">RTNY</span>
        </div>
      </div>
    </div>
  );
}
