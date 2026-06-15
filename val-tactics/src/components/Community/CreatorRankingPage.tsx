import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import styles from './CreatorRankingPage.module.css'

interface Creator {
  user_id: string; username: string; avatar_url?: string
  creation_count: number; total_likes: number
  follower_count: number; favorite_count: number
}

interface Props { onViewProfile?: (uid: string) => void }

type RankTab = 'creation' | 'likes' | 'follows' | 'favs'

const tabs: { id: RankTab; label: string; desc: string; sort: (c: Creator) => number; fmt: (n: number) => string }[] = [
  { id: 'creation', label: '创作榜', desc: '战术 + 点位 + 帖子', sort: c => c.creation_count, fmt: n => `${n} 个` },
  { id: 'likes', label: '点赞榜', desc: '获得的总点赞数', sort: c => c.total_likes, fmt: n => `${n} 赞` },
  { id: 'follows', label: '关注榜', desc: '粉丝数量', sort: c => c.follower_count, fmt: n => `${n} 粉丝` },
  { id: 'favs', label: '收藏榜', desc: '被收藏次数', sort: c => c.favorite_count, fmt: n => `${n} 次` },
]

export default function CreatorRankingPage({ onViewProfile }: Props) {
  const [creators, setCreators] = useState<Creator[]>([])
  const [tab, setTab] = useState<RankTab>('creation')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase.rpc('creator_ranking', { p_limit: 30, p_sort_by: tab }).then(({ data }) => {
      setCreators((data || []) as Creator[])
      setLoading(false)
    })
  }, [tab])

  const activeTab = tabs.find(t => t.id === tab)!

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>🏆 创作者排行</h2>
        <span className={styles.subtitle}>{activeTab.desc}</span>
      </div>

      <div className={styles.tabBar}>
        {tabs.map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : creators.length === 0 ? (
        <div className={styles.empty}>虚位以待</div>
      ) : (
        <div className={styles.list}>
          {/* Top 3 — 大卡片 */}
          {creators.slice(0, 3).map((c, i) => (
            <div key={c.user_id} className={`${styles.cardTop} ${styles['rank' + (i + 1)]}`} onClick={() => onViewProfile?.(c.user_id)} style={{ cursor: 'pointer' }}>
              <div className={styles.rankBadge}>{i + 1}</div>
              <div className={styles.avatar}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.username || '?')[0]}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{c.username?.split('@')[0] || '用户'}</div>
                <div className={styles.statsRow}>
                  <span>{c.creation_count} 作品</span>
                  <span>{c.total_likes} 赞</span>
                  <span>{c.follower_count} 粉丝</span>
                </div>
              </div>
              <div className={styles.score}>{activeTab.fmt(activeTab.sort(c))}</div>
            </div>
          ))}

          {/* 4-30 — 列表 */}
          {creators.slice(3).map((c, i) => (
            <div key={c.user_id} className={styles.card} style={{ animationDelay: `${i * .03}s`, cursor: 'pointer' }} onClick={() => onViewProfile?.(c.user_id)}>
              <span className={styles.rankNum}>{i + 4}</span>
              <span className={styles.avatarSm}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.username || '?')[0]}
              </span>
              <span className={styles.name}>{c.username?.split('@')[0] || '用户'}</span>
              <span className={styles.score}>{activeTab.fmt(activeTab.sort(c))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
