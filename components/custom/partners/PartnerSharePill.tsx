'use client'

interface Props {
  name: string
}

export default function PartnerSharePill({ name }: Props) {
  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      // user cancelled or clipboard unavailable
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
      style={{
        backgroundColor: '#1a1819',
        border: '1px solid #1AC8ED',
        color: '#1AC8ED',
      }}
    >
      🔗 Share
    </button>
  )
}
