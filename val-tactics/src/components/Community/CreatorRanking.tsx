import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './CreatorRanking.module.css'

interface Creator {
  user_id: string
  username: string
  avatar_url?: string
  creation_count: number
  total_likes: number
  follower_count: number
  favorite_count: number
}

type RankTab = 'creation' | 'likes' | 'follows' | 'favs'

const tabConfig: { id: RankTab; label: string; sort: (c: Creator) => number }[] = [
  { id: 'creation', label: '创作榜', sort: c => c.creation_count },
  { id: 'likes', label: '点赞榜', sort: c => c.total_likes },
  { id: 'follows', label: '关注榜', sort: c => c.follower_count },
  { id: 'favs', label: '收藏榜', sort: c => c.favorite_count },
]

export default function CreatorRanking() {
  const [expanded, setExpanded] = useState(false)
  const [creators, setCreators] = useState<Creator[]>([])
  const [tab, setTab] = useState<RankTab>('creation')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoading(true)
    supabase.rpc('creator_ranking', { p_limit: 10 }).then(({ data }) => {
      setCreators((data || []) as Creator[])
      setLoading(false)
    })
  }, [expanded])

  const sorted = [...creators].sort((a, b) => tabConfig.find(t => t.id === tab)!.sort(b) - tabConfig.find(t => t.id === tab)!.sort(a))

  return (
    <div className={styles.rank}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <span>🏆 创作者排行</span>
        <span style={{ fontSize: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className={styles.body}>
          <div className={styles.tabs}>
            {tabConfig.map(t => (
              <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className={styles.loading}>加载中...</div>
          ) : (
            <div className={styles.list}>
              {sorted.map((c, i) => (
                <div key={c.user_id} className={styles.item}>
                  <span className={styles.rankNum}>{i + 1}</span>
                  <span className={styles.avatar}>{c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.username || '?')[0]}</span>
                  <span className={styles.name}>{c.username?.split('@')[0] || '用户'}</span>
                  <span className={styles.score}>
                    {tab === 'creation' && c.creation_count}
                    {tab === 'likes' && c.total_likes}
                    {tab === 'follows' && c.follower_count}
                    {tab === 'favs' && c.favorite_count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
