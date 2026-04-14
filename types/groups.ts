export interface Group {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  about: string | null
  rules: string | null
  cover_image_url: string | null
  card_image_url: string | null
  accent_color: string
  category: string | null
  member_count: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface GroupSpotlight {
  id: string
  group_id: string
  title: string
  subject: string
  description: string | null
  image_url: string | null
  link_url: string | null
  active: boolean
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

export interface GroupOrganizer {
  id: string
  group_id: string
  name: string
  role: string
  bio: string | null
  avatar_url: string | null
  sort_order: number
}

export interface GroupWithMembership extends Group {
  is_member?: boolean
  user_vote?: string | null
}

export interface EventPitch {
  id: string
  group_id: string
  organizer_id: string
  title: string
  description: string
  category: string
  price_min: number
  price_max: number
  date_start: string
  date_end: string
  preferred_locations: string[]
  ideas_details: string | null
  interest_count: number
  status: 'active' | 'closed' | 'archived'
  created_at: string
}

export interface UserPitchPoints {
  id: string
  user_id: string
  total_points: number
  badge_slug: string | null
  badge_title: string | null
  badge_emoji: string | null
  updated_at: string
}

export type PointAction =
  | 'quick_submit'
  | 'date_vote'
  | 'location_vote'
  | 'price_vote'
  | 'full_form_submit'
  | 'feedback_update'

export interface PitchFeedback {
  id: string
  pitch_id: string
  member_id: string
  interest_level: 'very_interested' | 'somewhat_interested' | 'not_interested'
  thumbs_vote: 'up' | 'down' | null
  preferred_dates: string[]
  preferred_location: string | null
  price_acceptable: boolean
  price_range_min: number | null
  price_range_max: number | null
  additional_comments: string | null
  action_commitment: 'interested' | 'very_interested' | null
  submitted_at: string
}
