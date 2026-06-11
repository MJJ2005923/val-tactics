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
