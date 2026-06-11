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

  // 更新评论计数
  if (data) {
    void supabase.rpc('increment_comment_count', { share_id: params.targetId })
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
