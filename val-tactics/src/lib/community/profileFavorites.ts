import { supabase } from '../supabase'

export async function toggleProfileFavorite(userId: string, targetUserId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('profile_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('target_user_id', targetUserId)
    .single()

  if (existing) {
    await supabase.from('profile_favorites').delete().eq('id', existing.id)
    void supabase.rpc('decrement_favorite_count', { p_user_id: targetUserId })
    return false
  } else {
    await supabase.from('profile_favorites').insert({ user_id: userId, target_user_id: targetUserId })
    void supabase.rpc('increment_favorite_count', { p_user_id: targetUserId })
    void supabase.rpc('create_notification', { p_user_id: targetUserId, p_type: 'favorite', p_from_user_id: userId })
    return true
  }
}

export async function isProfileFavorited(userId: string, targetUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profile_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('target_user_id', targetUserId)
    .single()
  return !!data
}
