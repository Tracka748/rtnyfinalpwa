export const CREW_STATUS_LABELS: Record<string, string> = {
  family: "👨‍👩‍👧 Family",
  couples: "❤️ Couples",
  friends: "🍻 Friends",
  coworkers: "💼 Coworkers",
  college_friends: "🎓 College Friends",
  sports_team: "🏀 Sports Team",
  gaming_group: "🎮 Gaming Group",
  birthday_group: "🎉 Birthday Group",
  community_volunteer: "🙏 Community/Volunteer",
  club_organization: "🎭 Club/Organization",
}

export function getCrewStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null
  return CREW_STATUS_LABELS[status] ?? null
}
