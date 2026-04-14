interface Props {
  about: string | null
  rules: string | null
  groupName: string
  accentColor: string
}

export default function GroupAbout({ about, rules, groupName, accentColor }: Props) {
  if (!about && !rules) return null

  return (
    <div className="space-y-6">
      {about && (
        <div>
          <h2
            className="font-slab-serif font-bold text-4xl text-[#F9FDFF] mb-8 pl-4"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            About {groupName}
          </h2>
          <p className="font-sans text-sm text-[#c8d8dc] leading-relaxed">{about}</p>
        </div>
      )}

      {rules && (
        <div className="bg-[#1a1a1c] rounded-xl p-5 border border-white/5">
          <h2
            className="font-slab-serif font-bold text-4xl text-[#F9FDFF] mb-8 pl-4"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            Community Guidelines
          </h2>
          <p className="font-sans text-sm text-[#c8d8dc] leading-relaxed">{rules}</p>
        </div>
      )}
    </div>
  )
}
