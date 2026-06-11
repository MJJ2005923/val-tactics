/**
 * 社区功能类型定义
 */

// 用户扩展资料
export interface Profile {
  id: string
  username: string
  avatar_url?: string
  bio: string
  created_at: string
  updated_at?: string
}

// 战术分享
export interface TacticalShare {
  id: string
  user_id: string
  title: string
  description: string
  map_id: string
  tactic_data: Record<string, unknown> // 完整战术 JSON
  views: number
  like_count: number
  comment_count: number
  created_at: string
  updated_at?: string
  // 联表查询附加字段
  author?: Profile
}

// 评论
export interface Comment {
  id: string
  user_id: string
  target_type: 'tactic'
  target_id: string
  content: string
  created_at: string
  author?: Profile
}

// 通用分页
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// 社区路由状态（useState 管理）
export type CommunityView =
  | 'gallery'         // 战术广场首页
  | 'tactic-detail'   // 战术详情
  | 'create'          // 发布战术
