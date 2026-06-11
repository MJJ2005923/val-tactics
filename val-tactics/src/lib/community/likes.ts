import { supabase } from '../supabase'

export async function toggleLike(userId: string, targetType: string, targetId: string, targetUserId?: string): Promise<boolean> {
  const { data } = await supabase.rpc('toggle_like', {
    p_user_id: userId,
    p_target_type: targetType,
    p_target_id: targetId,
  })
  const liked = (data as boolean) || false
  // 点赞时通知对方
  if (liked && targetUserId && targetUserId !== userId) {
    void supabase.rpc('create_notification', {
      p_user_id: targetUserId,
      p_type: 'like',
      p_from_user_id: userId,
      p_target_type: targetType,
      p_target_id: targetId,
    })
  }
  return liked
}

export async function getLikeStatus(userId: string, targetType: string, targetId: string): Promise<boolean> {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()
  return !!data
}

export async function batchLikeStatus(userId: string, targetType: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .in('target_id', ids)
  return new Set((data || []).map(l => l.target_id))
}
