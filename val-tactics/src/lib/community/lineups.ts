import { supabase } from '../supabase'
import type { Lineup, PaginatedResponse } from '../../types/community'

/** 上传图片到 COS（通过 Worker 代理），返回公开 URL */
export async function uploadLineupImage(file: File, userId: string, lineupId: string, _slot: string): Promise<string | null> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', `lineups/${userId}/${lineupId}`)
  const resp = await fetch('/api/cos/upload', { method: 'POST', body: form })
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  return data.url || null
}

/** 浏览点位列表 */
export async function getLineups(params: {
  page?: number; pageSize?: number
  mapId?: string; agentId?: string; abilityId?: string
} = {}): Promise<PaginatedResponse<Lineup>> {
  const { page = 1, pageSize = 12, mapId, agentId, abilityId } = params
  let q = supabase.from('lineups').select('*', { count: 'exact' })
  if (mapId) q = q.eq('map_id', mapId)
  if (agentId) q = q.eq('agent_id', agentId)
  if (abilityId) q = q.eq('ability_id', abilityId)
  q = q.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  const { data, count } = await q.range(from, from + pageSize - 1)
  return { data: (data || []) as Lineup[], total: count || 0, page, pageSize }
}

/** 发布点位 */
export async function createLineup(params: {
  userId: string
  mapId: string
  agentId: string
  abilityId: string
  title: string
  description?: string
  startX?: number; startY?: number
  targetX?: number; targetY?: number
  positionImg?: string; aimImg?: string; releaseImg?: string; effectImg?: string
  difficulty?: number
  tags?: string[]
}): Promise<Lineup | null> {
  const { data } = await supabase.from('lineups').insert({
    user_id: params.userId,
    map_id: params.mapId,
    agent_id: params.agentId,
    ability_id: params.abilityId,
    title: params.title,
    description: params.description || '',
    start_x: params.startX ?? null, start_y: params.startY ?? null,
    target_x: params.targetX ?? null, target_y: params.targetY ?? null,
    position_img: params.positionImg || null,
    aim_img: params.aimImg || null,
    release_img: params.releaseImg || null,
    effect_img: params.effectImg || null,
    difficulty: params.difficulty || 1,
    tags: params.tags || [],
  }).select().single()
  return data as Lineup | null
}

/** 获取单个点位 */
export async function getLineup(id: string): Promise<Lineup | null> {
  void supabase.rpc('increment_lineup_view', { lineup_id: id })
  const { data } = await supabase.from('lineups').select('*').eq('id', id).single()
  return data as Lineup | null
}

/** 删除点位 */
export async function deleteLineup(id: string, userId?: string) {
  if (userId) { await deleteStorageImages(userId, id).catch(() => {}) }
  return supabase.from('lineups').delete().eq('id', id)
}

/** 原图转无损 WebP — 像素100%一致，体积比PNG小40-60% */
export async function toLosslessWebP(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.width   // 原尺寸，不缩放
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  img.close()

  return new Promise((resolve, reject) => {
    // quality=1 在 Chrome 中走无损 WebP
    canvas.toBlob(blob => {
      blob ? resolve(blob) : reject(new Error('转换失败'))
    }, 'image/webp', 1)
  })
}

/** TODO: 删除点位时清理 COS 图片（需新增 Worker /api/cos/delete 路由） */
export async function deleteStorageImages(_userId: string, _lineupId: string) {
  // 当前 COS 上传路径: lineups/{userId}/{lineupId}/{timestamp}.webp
  // COS 删除需 Worker 代理 + 遍历 listObjects
}
