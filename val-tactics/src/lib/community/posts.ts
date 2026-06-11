import { supabase } from '../supabase'
import type { Post, PaginatedResponse, PostCategory } from '../../types/community'

export async function getPosts(params: {
  page?: number; pageSize?: number; category?: PostCategory | ''; search?: string
} = {}): Promise<PaginatedResponse<Post>> {
  const { page = 1, pageSize = 15, category, search } = params
  let q = supabase.from('posts').select('*', { count: 'exact' })
  if (category) q = q.eq('category', category)
  if (search) q = q.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  q = q.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  const { data, count } = await q.range(from, from + pageSize - 1)
  return { data: (data || []) as Post[], total: count || 0, page, pageSize }
}

export async function getPost(id: string): Promise<Post | null> {
  void supabase.rpc('increment_post_view', { post_id: id })
  const { data } = await supabase.from('posts').select('*').eq('id', id).single()
  return data as Post | null
}

export async function createPost(params: {
  userId: string; title: string; content: string
  category: PostCategory; tags?: string[]
}): Promise<Post | null> {
  const { data } = await supabase.from('posts').insert({
    user_id: params.userId,
    title: params.title,
    content: params.content,
    category: params.category,
    tags: params.tags || [],
  }).select().single()
  return data as Post | null
}

export async function deletePost(id: string) {
  return supabase.from('posts').delete().eq('id', id)
}
