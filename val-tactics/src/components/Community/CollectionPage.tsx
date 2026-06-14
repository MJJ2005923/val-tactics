import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import styles from './CollectionPage.module.css'

interface Props {
  type: 'favorites' | 'liked'
  onViewTactic: (id: string) => void
  onViewPost: (id: string) => void
  onViewLineup: (id: string) => void
}

interface Item {
  id: string
  title: string
  type: '战术' | '帖子' | '点位'
  created_at: string
  views?: number
  like_count?: number
  comment_count?: number
}

export default function CollectionPage({ type, onViewTactic, onViewPost, onViewLineup }: Props) {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | '战术' | '帖子' | '点位'>('all')

  useEffect(() => {
    if (!user) { setLoading(false); return }
    (async () => {
      if (type === 'favorites') {
        // 收藏 = content_favorites（通用）+ lineup_favorites（旧兼容）
        const [cfResult, lfResult] = await Promise.all([
          supabase.from('content_favorites').select('target_type,target_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
          supabase.from('lineup_favorites').select('lineup_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        ])
        const favItems: Item[] = []
        const addedIds = new Set<string>()
        // 通用收藏
        for (const f of (cfResult.data || [])) {
          const table = f.target_type === 'tactic' ? 'tactical_shares' : f.target_type === 'post' ? 'posts' : 'lineups'
          const typeLabel = f.target_type === 'tactic' ? '战术' : f.target_type === 'post' ? '帖子' : '点位'
          const { data: d } = await supabase.from(table).select('id,title,created_at,views,like_count,comment_count').eq('id', f.target_id).maybeSingle()
          if (d && !addedIds.has(`${f.target_type}:${f.target_id}`)) {
            addedIds.add(`${f.target_type}:${f.target_id}`)
            favItems.push({ ...d, type: typeLabel })
          }
        }
        // 旧点位收藏（去重）
        for (const f of (lfResult.data || [])) {
          if (addedIds.has(`lineup:${f.lineup_id}`)) continue
          addedIds.add(`lineup:${f.lineup_id}`)
          const { data: d } = await supabase.from('lineups').select('id,title,created_at,views,like_count,comment_count').eq('id', f.lineup_id).maybeSingle()
          if (d) favItems.push({ ...d, type: '点位' })
        }
        favItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setItems(favItems)
      } else {
        // 赞过 = likes
        const { data: likes } = await supabase.from('likes').select('target_type,target_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
        const likedItems: Item[] = []
        if (likes) {
          for (const l of likes) {
            const table = l.target_type === 'tactic' ? 'tactical_shares' : l.target_type === 'post' ? 'posts' : 'lineups'
            const { data: d } = await supabase.from(table).select('id,title,created_at,views,like_count,comment_count').eq('id', l.target_id).maybeSingle()
            if (d) likedItems.push({ ...d, type: l.target_type === 'tactic' ? '战术' : l.target_type === 'post' ? '帖子' : '点位' })
          }
        }
        setItems(likedItems)
      }
      setLoading(false)
    })()
  }, [user, type])

  if (loading) return <div className={styles.page}><div className={styles.loading}>加载中...</div></div>
  if (!user) return <div className={styles.page}><div className={styles.empty}>请先登录</div></div>

  const filteredItems = filter === 'all' ? items : items.filter(item => item.type === filter)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h3>{type === 'favorites' ? '⭐ 我的收藏' : '❤️ 我的赞过'}</h3>
        <span className={styles.count}>{items.length} 条</span>
      </div>

      {/* 分类筛选 */}
      <div className={styles.filters}>
        {(['all', '战术', '帖子', '点位'] as const).map(f => (
          <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}>
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className={styles.empty}>{filter === 'all' ? (type === 'favorites' ? '还没有收藏任何内容' : '还没有赞过任何内容') : `还没有${filter}相关`}</div>
      ) : (
        <div className={styles.list}>
          {filteredItems.map(item => (
            <div key={item.id} className={styles.item}
              onClick={() => {
                if (item.type === '战术') onViewTactic(item.id)
                else if (item.type === '帖子') onViewPost(item.id)
                else onViewLineup(item.id)
              }}>
              <div className={styles.itemTop}>
                <span className={styles.itemType}>{item.type}</span>
                <span className={styles.itemTitle}>{item.title}</span>
              </div>
              <div className={styles.itemMeta}>
                <span>{new Date(item.created_at).toLocaleDateString('zh')}</span>
                {item.views != null && <span>{item.views} 浏览</span>}
                {item.like_count != null && <span>{item.like_count} 赞</span>}
                {item.comment_count != null && <span>{item.comment_count} 评论</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
