import { supabase } from '../supabase'
import type { Notification } from '../../types/community'

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) { console.error('[notif] getNotifications:', error.message); return [] }
  return (data || []) as Notification[]
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('unread_count', { p_user_id: userId })
  if (error) { console.error('[notif] unread_count:', error.message); return 0 }
  return (data as number) || 0
}

export async function markAsRead(userId: string, notifId?: string): Promise<void> {
  let q = supabase.from('notifications').update({ read: true }).eq('user_id', userId)
  if (notifId) q = q.eq('id', notifId)
  await q
}
