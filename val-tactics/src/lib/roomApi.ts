/**
 * 多人实时协作 — 房间 API
 */
import { supabase } from './supabase'

const MAX_ROOMS_PER_USER = 3

/** 检查用户是否能创建房间（付费套餐 + 数量限制） */
export async function canCreateRoom(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // 1. 检查本地套餐
  const tier = localStorage.getItem('val-tactics-tier') || 'free'
  const ownkey = localStorage.getItem('val-tactics-ownkey') === '1'

  if (tier === 'free' && !ownkey) {
    return { allowed: false, reason: '请先升级到标准套餐（¥30/月）' }
  }
  if (ownkey) {
    return { allowed: false, reason: '自备Key套餐不含协作功能，请升级标准套餐' }
  }

  // 2. 检查套餐未过期（激活时间 + 30天）
  const expiry = localStorage.getItem('val-tactics-tier-at')
  if (expiry && Number(expiry) + 30 * 86400000 < Date.now()) {
    return { allowed: false, reason: '套餐已过期，请续费' }
  }

  // 3. 检查活跃房间数量 ≤ 3
  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', userId)
    .eq('status', 'open')

  if (error) {
    console.error('canCreateRoom count error:', error.message)
    return { allowed: false, reason: '网络错误，请重试' }
  }

  if ((count || 0) >= MAX_ROOMS_PER_USER) {
    return { allowed: false, reason: `最多创建 ${MAX_ROOMS_PER_USER} 个活跃房间，请先关闭旧房间` }
  }

  return { allowed: true }
}

export interface Room {
  id: string
  host_id: string
  editor_id?: string
  map_id: string
  atk_roster: string[]
  def_roster: string[]
  side: string
  status: string
  created_at: string
  updated_at?: string
}

export interface RoomMember {
  room_id: string
  user_id: string
  joined_at: string
  username?: string
}

/** 生成6位随机房间码 */
function genRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** 创建房间 */
export async function createRoom(userId: string, mapId: string, side: string): Promise<{ room: Room; error?: string }> {
  for (let i = 0; i < 5; i++) {
    const code = genRoomCode()
    const { data, error } = await supabase.from('rooms').insert({
      id: code, host_id: userId, editor_id: userId,
      map_id: mapId, side,
    }).select().single()
    if (error) {
      if (error.code === '23505') continue // 码冲突，重试
      console.error('createRoom error:', error.message, error.details, error.hint)
      return { room: null as any, error: error.message || error.details || '数据库错误' }
    }
    if (!data) { console.error('createRoom: no data returned'); return { room: null as any, error: '数据库未返回数据' } }
    const { error: memErr } = await supabase.from('room_members').insert({ room_id: code, user_id: userId })
    if (memErr) {
      console.error('createRoom member insert error:', memErr.message, memErr.details)
      // 成员插入失败，清理已创建的房间
      await supabase.from('rooms').delete().eq('id', code)
      return { room: null as any, error: `成员添加失败：${memErr.message || memErr.details}` }
    }
    return { room: data as Room }
  }
  return { room: null as any, error: '房间码重复，请重试' }
}

/** 加入房间 */
export async function joinRoom(roomId: string, userId: string): Promise<Room | null> {
  // 查房间是否存在
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId.toUpperCase()).single()
  if (!room) return null
  if (room.status !== 'open') return null
  // 查已有人数
  const { count } = await supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id)
  if ((count || 0) >= 8) return null
  // 加入
  await supabase.from('room_members').upsert({ room_id: room.id, user_id: userId, joined_at: new Date().toISOString() }, { onConflict: 'room_id,user_id' })
  return room as Room
}

/** 离开房间 */
export async function leaveRoom(roomId: string, userId: string) {
  await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
  // 如果房主离开，自动转让给最早加入的成员
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  if (room && room.host_id === userId) {
    const { data: next } = await supabase.from('room_members').select('*').eq('room_id', roomId).order('joined_at', { ascending: true }).limit(1).single()
    if (next) {
      await supabase.from('rooms').update({ host_id: next.user_id, editor_id: next.user_id }).eq('id', roomId)
    } else {
      // 没人了，删除房间
      await supabase.from('rooms').delete().eq('id', roomId)
    }
  }
  // 如果当前编辑者离开，编辑权回归房主
  if (room && room.editor_id === userId) {
    await supabase.from('rooms').update({ editor_id: room.host_id }).eq('id', roomId)
  }
}

/** 转让编辑权 */
export async function transferEditor(roomId: string, toUserId: string) {
  return supabase.from('rooms').update({ editor_id: toUserId }).eq('id', roomId)
}

/** 获取房间信息 */
export async function getRoom(roomId: string): Promise<Room | null> {
  const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
  return (data || null) as Room | null
}

/** 获取房间成员 */
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data } = await supabase.from('room_members').select('*').eq('room_id', roomId).order('joined_at', { ascending: true })
  return (data || []) as RoomMember[]
}

/** 踢人（仅房主） */
export async function kickMember(roomId: string, targetUserId: string) {
  return supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', targetUserId)
}
