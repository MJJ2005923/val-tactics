import { supabase } from '../supabase'
import type { Notification } from '../../types/community'

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data || []) as Notification[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { data } = await supabase.rpc('unread_count', { p_user_id: userId })
  return (data as number) || 0
}

export async function markAsRead(userId: string, notifId?: string): Promise<void> {
  let q = supabase.from('notifications').update({ read: true }).eq('user_id', userId)
  if (notifId) q = q.eq('id', notifId)
  await q
}
