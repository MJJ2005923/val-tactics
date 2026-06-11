/**
 * 战术分享 API
 */
import { supabase } from '../supabase'
import type { TacticalShare, PaginatedResponse } from '../../types/community'

/** 获取战术列表（分页 + 排序） */
export async function getTactics(params: {
  page?: number
  pageSize?: number
  sort?: 'latest' | 'hot'
  mapId?: string
  search?: string
} = {}): Promise<PaginatedResponse<TacticalShare>> {
  const { page = 1, pageSize = 12, sort = 'latest', mapId, search } = params

  let query = supabase
    .from('tactical_shares')
    .select('*', { count: 'exact' })

  if (mapId) query = query.eq('map_id', mapId)
  if (search) query = query.ilike('title', `%${search}%`)

  if (sort === 'hot') {
    query = query.order('like_count', { ascending: false })
  }
  query = query.order('created_at', { ascending: false })

  const from = (page - 1) * pageSize
  const { data, count } = await query.range(from, from + pageSize - 1)

  return { data: (data || []) as TacticalShare[], total: count || 0, page, pageSize }
}

/** 获取单个战术详情 */
export async function getTactic(id: string): Promise<TacticalShare | null> {
  // 增加浏览量
  void supabase.rpc('increment_view', { share_id: id })
  const { data } = await supabase
    .from('tactical_shares')
    .select('*')
    .eq('id', id)
    .single()
  return data as TacticalShare | null
}

/** 发布战术 */
export async function createTactic(params: {
  userId: string
  title: string
  description: string
  mapId: string
  tacticData: Record<string, unknown>
  previewImage?: string
  lineupImages?: string[]
  effectImages?: string[]
}): Promise<TacticalShare | null> {
  const { data } = await supabase
    .from('tactical_shares')
    .insert({
      user_id: params.userId,
      title: params.title,
      description: params.description,
      map_id: params.mapId,
      tactic_data: params.tacticData,
      preview_image: params.previewImage || null,
      lineup_images: params.lineupImages || [],
      effect_images: params.effectImages || [],
    })
    .select()
    .single()
  return data as TacticalShare | null
}

/** 删除战术 */
export async function deleteTactic(id: string) {
  return supabase.from('tactical_shares').delete().eq('id', id)
}
