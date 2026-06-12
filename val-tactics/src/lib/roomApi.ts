/**
 * 多人实时协作 — 房间 API
 * createRoom / joinRoom / leaveRoom → Cloudflare Worker（service_key，绕过RLS）
 * getRoom / getRoomMembers / transferEditor / kickMember → Supabase 直连
 */
import { supabase } from './supabase'

const API_BASE = '/api/room'

/** 检查用户是否能创建房间（Worker 服务端校验） */
export async function canCreateRoom(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const resp = await fetch(`${API_BASE}/check-permission`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    return await resp.json()
  } catch (e: any) {
    return { allowed: false, reason: e.message || '网络错误' }
  }
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

/** 创建房间（Worker API） */
export async function createRoom(userId: string, mapId: string, side: string): Promise<{ room: Room; error?: string }> {
  try {
    const resp = await fetch(`${API_BASE}/create`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, mapId, side }),
    })
    return await resp.json()
  } catch (e: any) {
    return { room: null as any, error: e.message || '网络错误' }
  }
}

/** 加入房间（Worker API） */
export async function joinRoom(roomId: string, userId: string): Promise<Room | null> {
  try {
    const resp = await fetch(`${API_BASE}/join`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, userId }),
    })
    const data = await resp.json()
    if (data.error) return null
    return data.room as Room
  } catch {
    return null
  }
}

/** 离开房间（Worker API） */
export async function leaveRoom(roomId: string, userId: string) {
  try {
    await fetch(`${API_BASE}/leave`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, userId }),
    })
  } catch {}
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
