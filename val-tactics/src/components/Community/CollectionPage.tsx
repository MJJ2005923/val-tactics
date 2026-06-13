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

  useEffect(() => {
    if (!user) { setLoading(false); return }
    (async () => {
      if (type === 'favorites') {
        // 收藏 = lineup_favorites
        const { data: favs } = await supabase.from('lineup_favorites').select('lineup_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
        const favItems: Item[] = []
        if (favs) {
          for (const f of favs) {
            const { data: d } = await supabase.from('lineups').select('id,title,created_at,views,like_count,comment_count').eq('id', f.lineup_id).maybeSingle()
            if (d) favItems.push({ ...d, type: '点位' })
          }
        }
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h3>{type === 'favorites' ? '⭐ 我的收藏' : '❤️ 我的赞过'}</h3>
        <span className={styles.count}>{items.length} 条</span>
      </div>
      {items.length === 0 ? (
        <div className={styles.empty}>{type === 'favorites' ? '还没有收藏任何内容' : '还没有赞过任何内容'}</div>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
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
