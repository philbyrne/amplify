export type Platform = 'linkedin' | 'x'

export interface VoiceProfile {
  posts: string[]
  tone_notes: string
  last_synced: string
  audience_context?: string
  experience_summary?: string
}

export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: 'employee' | 'manager' | 'admin'
  points: number
  voice_profile: VoiceProfile | null
  linkedin_url: string | null
  x_handle?: string | null
  instagram_handle?: string | null
  onboarding_completed?: boolean
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  title: string
  description: string | null
  body: string | null
  platform_targets: Platform[]
  drive_folder_url: string | null
  has_no_files: boolean
  example_copies: string[]
  tags: string[]
  cover_image_url: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  share_count?: number
}

export interface DriveFile {
  id: string
  package_id: string
  drive_file_id: string
  name: string
  mime_type: string | null
  web_view_link: string | null
  thumbnail_link: string | null
}

export interface Share {
  id: string
  user_id: string
  package_id: string | null
  moment_id?: string | null
  platform: Platform
  copy_used: string | null
  utm_code: string | null
  shared_at: string
}

export interface CopyGenerationRequest {
  platform: Platform
  packageId: string
  packageTitle: string
  packageBody: string
  exampleCopies: string[]
  voiceProfile: VoiceProfile | null
  formalityScore: number
  voiceInfluenceScore: number
  audienceScore: number
  lengthTarget: number
  cta?: string
  ctaUrl?: string
  differentiators: string[]
  variationIndex: number
  selectedAssetContext?: string  // caption/type of the asset the user chose to post about
}

export interface MediaAsset {
  url: string
  type: 'image' | 'video' | 'animation' | 'drive' | 'link'
  caption?: string
}

export interface ParsedMomentContent {
  background: string
  key_messages: string[]
  talking_points: string[]
  call_to_action: string
  cta_url?: string
  media_assets?: MediaAsset[]
  priority?: 1 | 2 | 3
}

export interface MomentSharer {
  name: string | null
  avatar_url: string | null
}

export interface SharingMoment {
  id: string
  title: string
  summary: string | null
  parsed_content: ParsedMomentContent | null
  doc_url: string | null
  platform_targets: Platform[]
  created_by: string
  created_at: string
  expires_at: string
  is_active: boolean
  share_count?: number
  sharers?: MomentSharer[]
}

export interface LeaderboardEntry {
  userId: string
  name: string | null
  avatar_url: string | null
  points: number
  shareCount: number
  rank: number
}
