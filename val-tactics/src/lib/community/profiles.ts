/**
 * 用户资料 API
 */
import { supabase } from '../supabase'
import type { Profile } from '../../types/community'

/** 获取单个用户资料（不存在则自动创建） */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (data) return data as Profile
  // 不存在则自动创建
  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: userId, username: userId })
    .select()
    .single()
  return (created || null) as Profile | null
}

/** 批量获取用户资料 */
export async function getProfiles(userIds: string[]): Promise<Profile[]> {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)
  return (data || []) as Profile[]
}

/** 更新个人资料 */
export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'username' | 'avatar_url' | 'bio'>>) {
  return supabase.from('profiles').update(updates).eq('id', userId)
}

/** 获取用户统计（一次 RPC 调用） */
export async function getProfileStats(userId: string) {
  const { data } = await supabase.rpc('get_profile_stats', { p_user_id: userId })
  return (data as any) || { tacticCount: 0, postCount: 0, lineupCount: 0, totalLikes: 0, favoriteCount: 0 }
}
