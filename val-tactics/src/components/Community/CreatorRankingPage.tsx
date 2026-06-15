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
        <>
        <div className={styles.podium}>
          {creators.slice(0, 3).map((c, i) => {
              const rankConf = [
                { emoji: '👑', label: '冠军', cls: styles.first },
                { emoji: '🥈', label: '亚军', cls: styles.second },
                { emoji: '🥉', label: '季军', cls: styles.third },
              ][i]
              return (
                <div key={c.user_id} className={`${styles.podiumCard} ${rankConf.cls}`} onClick={() => onViewProfile?.(c.user_id)}>
                  <div className={styles.podiumGlow} />
                  <div className={styles.podiumRank}>
                    <span className={styles.rankEmoji}>{rankConf.emoji}</span>
                    <span className={styles.rankLabel}>{rankConf.label}</span>
                  </div>
                  <div className={styles.podiumAvatar}>
                    {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.username || '?')[0]}
                  </div>
                  <div className={styles.podiumName}>{c.username?.split('@')[0] || '用户'}</div>
                  <div className={styles.podiumScore}>{activeTab.fmt(activeTab.sort(c))}</div>
                  <div className={styles.podiumStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statNum}>{c.creation_count}</span>
                      <span className={styles.statLabel}>作品</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                      <span className={styles.statNum}>{c.total_likes}</span>
                      <span className={styles.statLabel}>获赞</span>
                    </div>
                    <div className={styles.statDivider} />
                    <div className={styles.statItem}>
                      <span className={styles.statNum}>{c.follower_count}</span>
                      <span className={styles.statLabel}>粉丝</span>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {creators.length > 3 && <div className={styles.rankDivider}>其他创作者</div>}
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
        </>
      )}
    </div>
  )
}
