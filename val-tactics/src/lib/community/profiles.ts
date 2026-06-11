/**
 * 用户资料 API
 */
import { supabase } from '../supabase'
import type { Profile } from '../../types/community'

/** 获取单个用户资料 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data as Profile | null
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
