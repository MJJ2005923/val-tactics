/**
 * 评论 API
 */
import { supabase } from '../supabase'
import type { Comment } from '../../types/community'

/** 获取评论列表 */
export async function getComments(targetType: string, targetId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true })
  return (data || []) as Comment[]
}

/** 发表评论 */
export async function createComment(params: {
  userId: string
  targetType: string
  targetId: string
  content: string
}): Promise<Comment | null> {
  // 先做内容审核（客户端快速检查）
  const filterResult = await quickCheck(params.content)
  if (!filterResult.allowed) {
    throw new Error(filterResult.reason || '内容违规')
  }

  const { data } = await supabase
    .from('comments')
    .insert({
      user_id: params.userId,
      target_type: params.targetType,
      target_id: params.targetId,
      content: params.content,
    })
    .select()
    .single()

  // 更新评论计数 + 通知内容作者
  if (data) {
    void supabase.rpc('increment_comment_count', { target_id: params.targetId, target_type: params.targetType })

    // 查内容作者并通知
    let ownerId = ''
    if (params.targetType === 'profile') {
      ownerId = params.targetId // profile 的 targetId = user_id
    } else {
      const table = params.targetType === 'tactic' ? 'tactical_shares' : params.targetType === 'post' ? 'posts' : 'lineups'
      const { data: content } = await supabase.from(table).select('user_id').eq('id', params.targetId).maybeSingle()
      ownerId = (content as any)?.user_id || ''
    }
    if (ownerId && ownerId !== params.userId) {
      supabase.rpc('create_notification', {
        p_user_id: ownerId, p_type: 'comment', p_from_user_id: params.userId,
        p_target_type: params.targetType, p_target_id: params.targetId,
      }).then(({ error }) => { if (error) console.error('[notif] comment:', error.message) })
    }
  }

  return data as Comment | null
}

/** 删除评论 */
export async function deleteComment(id: string) {
  return supabase.from('comments').delete().eq('id', id)
}

/** 客户端快速内容检查 */
async function quickCheck(text: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const resp = await fetch('/api/content-filter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return await resp.json()
  } catch {
    return { allowed: true } // API 不可用时放行（词库已在客户端兜底）
  }
}
