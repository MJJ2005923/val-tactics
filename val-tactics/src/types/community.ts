/**
 * 社区功能类型定义
 */

export interface Profile {
  id: string
  username: string
  avatar_url?: string
  bio: string
  created_at: string
  updated_at?: string
  // 统计
  tactic_count?: number
  post_count?: number
  follower_count?: number
  following_count?: number
}

export interface TacticalShare {
  id: string
  user_id: string
  title: string
  description: string
  map_id: string
  tactic_data: Record<string, unknown>
  views: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at?: string
  author?: Profile
  liked?: boolean  // 当前用户是否已点赞
  preview_image?: string
  lineup_images?: string[]
  effect_images?: string[]
}

export interface Comment {
  id: string
  user_id: string
  target_type: 'tactic' | 'post'
  target_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  category: PostCategory
  tags: string[]
  views: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at?: string
  author?: Profile
  liked?: boolean
}

export type PostCategory = 'discussion' | 'guide' | 'map' | 'team'

export const POST_CATEGORIES: Record<PostCategory, string> = {
  discussion: '战术讨论',
  guide: '英雄攻略',
  map: '地图分析',
  team: '开黑组队',
}

export interface Like {
  id: string
  user_id: string
  target_type: string
  target_id: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow'
  from_user_id: string
  target_type?: string
  target_id?: string
  read: boolean
  created_at: string
  from_user?: Profile
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type CommunityView =
  | 'gallery'
  | 'tactic-detail'
  | 'create'
  | 'forum'
  | 'post-detail'
  | 'post-create'
  | 'profile'
  | 'lineups'
  | 'lineup-detail'
  | 'lineup-create'

export interface Lineup {
  id: string
  user_id: string
  map_id: string
  agent_id: string
  ability_id: string
  title: string
  description: string
  start_x: number | null
  start_y: number | null
  target_x: number | null
  target_y: number | null
  position_img: string | null
  aim_img: string | null
  release_img: string | null
  effect_img: string | null
  views: number
  like_count: number
  comment_count: number
  difficulty: number
  tags: string[]
  created_at: string
  updated_at?: string
  author?: Profile
  liked?: boolean
}

