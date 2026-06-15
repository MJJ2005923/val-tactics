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

const tabs: { id: RankTab; label: string; desc: string; fmt: (n: number) => string }[] = [
  { id: 'creation', label: '创作榜', desc: '战术 + 点位 + 帖子', fmt: n => `${n} 个` },
  { id: 'likes', label: '点赞榜', desc: '获得的总点赞数', fmt: n => `${n} 赞` },
  { id: 'follows', label: '关注榜', desc: '粉丝数量', fmt: n => `${n} 粉丝` },
  { id: 'favs', label: '收藏榜', desc: '被收藏次数', fmt: n => `${n} 次` },
]

const rankConfig = [
  { emoji: '👑', label: '冠军', cls: 'first' },
  { emoji: '🥈', label: '亚军', cls: 'second' },
  { emoji: '🥉', label: '季军', cls: 'third' },
] as const

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
  const top3 = creators.slice(0, 3)
  const getScore = (c: Creator) => tab === 'creation' ? c.creation_count : tab === 'likes' ? c.total_likes : tab === 'follows' ? c.follower_count : c.favorite_count

  const emptyPlaceholder = (i: number) => (
    <div key={`empty-${i}`} className={`${styles.podiumCard} ${styles[rankConfig[i].cls]}`}>
      <div className={styles.podiumGlow} />
      <div className={styles.podiumRank}>
        <span className={styles.rankEmoji}>{rankConfig[i].emoji}</span>
        <span className={styles.rankLabel}>{rankConfig[i].label}</span>
      </div>
      <div className={`${styles.podiumAvatar} ${styles.avatarEmpty}`}>?</div>
      <div className={styles.podiumName} style={{ color: 'rgba(255,255,255,.1)' }}>虚位以待</div>
      <div className={styles.podiumScore} style={{ color: 'rgba(255,255,255,.08)' }}>—</div>
      <div className={styles.podiumStats}>
        <div className={styles.statItem}><span className={styles.statNum}>-</span><span className={styles.statLabel}>作品</span></div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}><span className={styles.statNum}>-</span><span className={styles.statLabel}>获赞</span></div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}><span className={styles.statNum}>-</span><span className={styles.statLabel}>粉丝</span></div>
      </div>
    </div>
  )

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
      ) : (
        <>
        {/* 前三名领奖台 — 第一名独占C位 */}
        <div className={styles.podium}>
          {[0, 1, 2].map(i => {
            const c = top3[i]
            if (!c) return emptyPlaceholder(i)
            const rc = rankConfig[i]
            return (
              <div key={c.user_id} className={`${styles.podiumCard} ${styles[rc.cls]}`} onClick={() => onViewProfile?.(c.user_id)}>
                <div className={styles.podiumGlow} />
                <div className={styles.podiumRank}>
                  <span className={styles.rankEmoji}>{rc.emoji}</span>
                  <span className={styles.rankLabel}>{rc.label}</span>
                </div>
                <div className={styles.podiumAvatar}>
                  {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.username || '?')[0]}
                </div>
                <div className={styles.podiumName}>{c.username?.split('@')[0] || '用户'}</div>
                <div className={styles.podiumScore}>{activeTab.fmt(getScore(c))}</div>
                <div className={styles.podiumStats}>
                  <div className={styles.statItem}><span className={styles.statNum}>{c.creation_count}</span><span className={styles.statLabel}>作品</span></div>
                  <div className={styles.statDivider} />
                  <div className={styles.statItem}><span className={styles.statNum}>{c.total_likes}</span><span className={styles.statLabel}>获赞</span></div>
                  <div className={styles.statDivider} />
                  <div className={styles.statItem}><span className={styles.statNum}>{c.follower_count}</span><span className={styles.statLabel}>粉丝</span></div>
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
            <span className={styles.score}>{activeTab.fmt(Number(activeTab.id === 'creation' ? c.creation_count : activeTab.id === 'likes' ? c.total_likes : activeTab.id === 'follows' ? c.follower_count : c.favorite_count))}</span>
          </div>
        ))}
        </>
      )}
    </div>
  )
}
