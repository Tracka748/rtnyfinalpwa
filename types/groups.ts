export interface Group {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  cover_image_url: string | null
  card_image_url: string | null
  accent_color: string
  category: string | null
  member_count: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  notifications_enabled: boolean
}

export interface GroupPost {
  id: string
  group_id: string
  author_id: string | null
  title: string | null
  body: string
  post_type: 'update' | 'announcement' | 'poll'
  is_pinned: boolean
  created_at: string
}

export interface PollOption {
  id: string
  label: string
  votes: number
}

export interface GroupPoll {
  id: string
  group_id: string
  post_id: string | null
  question: string
  options: PollOption[]
  closes_at: string | null
  created_at: string
}

export interface GroupWithMembership extends Group {
  is_member?: boolean
  user_vote?: string | null
}
