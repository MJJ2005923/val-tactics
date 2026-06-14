import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { TacticalShare, Post, Lineup } from '../../types/community'
import styles from './CommunityHome.module.css'

interface Props {
  search?: string
  onViewTactic: (id: string) => void
  onViewPost: (id: string) => void
  onViewLineup: (id: string) => void
  onViewProfile: (uid: string) => void
  onCreateTactic: () => void
  onCreatePost: () => void
}

export default function CommunityHome({ search, onViewTactic, onViewPost, onViewLineup, onCreateTactic, onCreatePost }: Props) {
  const [hotTactics, setHotTactics] = useState<TacticalShare[]>([])
  const [hotPosts, setHotPosts] = useState<Post[]>([])
  const [hotLineups, setHotLineups] = useState<Lineup[]>([])
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    // 排行榜 — 按点赞数排序
    supabase.from('tactical_shares').select('id,title,user_id,views,like_count,comment_count,created_at,preview_image,map_id').order('like_count', { ascending: false }).limit(3).then(({ data, error }) => {
      if (error) console.error('[CommunityHome] tactics:', error.message)
      setHotTactics((data || []) as any)
    })
    supabase.from('posts').select('id,title,user_id,views,like_count,comment_count,created_at').order('like_count', { ascending: false }).limit(5).then(({ data, error }) => {
      if (error) console.error('[CommunityHome] posts:', error.message)
      setHotPosts((data || []) as any)
    })
    supabase.from('lineups').select('id,title,user_id,views,like_count,difficulty,created_at,position_img,aim_img').order('like_count', { ascending: false }).limit(3).then(({ data, error }) => {
      if (error) console.error('[CommunityHome] lineups:', error.message)
      setHotLineups((data || []) as any)
    })
    // 社区动态 — 发布行为 + 破百互动
    Promise.all([
      supabase.from('tactical_shares').select('id,title,user_id,created_at,like_count').order('created_at', { ascending: false }).limit(4),
      supabase.from('posts').select('id,title,user_id,created_at,like_count').order('created_at', { ascending: false }).limit(4),
      supabase.from('lineups').select('id,title,user_id,created_at,like_count').order('created_at', { ascending: false }).limit(4),
      supabase.from('tactical_shares').select('id,title,user_id,created_at,like_count').gte('like_count', 100).order('created_at', { ascending: false }).limit(3),
    ]).then(([{ data: tt }, { data: pt }, { data: lt }, { data: hotLikes }]) => {
      const feed: any[] = []
      const add = (items: any[] | null, type: string) => {
        (items || []).forEach((x: any) => feed.push({ user_id: x.user_id, title: x.title, target_type: type, target_id: x.id, created_at: x.created_at, action: '发布了' }))
      }
      add(tt, 'tactic'); add(pt, 'post'); add(lt, 'lineup')
      const added = new Set()
      ;(hotLikes || []).forEach((x: any) => {
        if (!added.has(`${x.id}`)) { added.add(`${x.id}`); feed.push({ user_id: x.user_id, title: x.title, target_type: 'tactic', target_id: x.id, created_at: x.created_at, action: '破百赞' }) }
      })
      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setActivities(feed.slice(0, 10))
    })
  }, [])

  const filteredTactics = search ? hotTactics.filter(t => t.title?.toLowerCase().includes(search.toLowerCase())) : hotTactics
  const filteredPosts = search ? hotPosts.filter(p => p.title?.toLowerCase().includes(search.toLowerCase())) : hotPosts
  const filteredLineups = search ? hotLineups.filter(l => l.title?.toLowerCase().includes(search.toLowerCase())) : hotLineups

  return (
    <div className={styles.home}>
      {/* 三栏布局 */}
      <div className={styles.grid3}>
        {/* 战术列 */}
        <div className={styles.column}>
          <div className={styles.colTitle}><span className={`${styles.dot} ${styles.dotTactic}`} />推荐战术</div>
          {filteredTactics.length === 0
            ? <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center' }}>暂无战术</div>
            : filteredTactics.map(t => (
              <div key={t.id} className={styles.cardBig} onClick={() => onViewTactic(t.id)}>
                <div className={styles.cardImgWrap}>
                  <img src={t.preview_image || `/images/maps/${(t as any).map_id || 'ascent'}.png`} alt="" className={styles.cardImg} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{t.title}</div>
                  <div className={styles.cardMeta}>{t.views} 浏览 · 赞 {t.like_count || 0}</div>
                </div>
              </div>
            ))}
          <button className={styles.moreBtn} onClick={onCreateTactic}>+ 发布战术</button>
        </div>

        {/* 帖子列 */}
        <div className={styles.column}>
          <div className={styles.colTitle}><span className={`${styles.dot} ${styles.dotPost}`} />热门帖子</div>
          {filteredPosts.length === 0
            ? <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center' }}>暂无帖子</div>
            : filteredPosts.map(p => (
              <div key={p.id} className={styles.cardCompact} onClick={() => onViewPost(p.id)}>
                <span className={styles.cardCompactTitle}>{p.title}</span>
                {(p.comment_count || 0) > 0 && <span className={styles.replyBadge}>{p.comment_count}回复</span>}
              </div>
            ))}
          <button className={styles.moreBtn} onClick={onCreatePost}>+ 发帖</button>
        </div>

        {/* 点位列 */}
        <div className={styles.column}>
          <div className={styles.colTitle}><span className={`${styles.dot} ${styles.dotLineup}`} />精选点位</div>
          {filteredLineups.length === 0
            ? <div style={{ padding: 16, fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center' }}>暂无点位</div>
            : filteredLineups.map(l => (
              <div key={l.id} className={styles.cardBig} onClick={() => onViewLineup(l.id)}>
                <div className={styles.cardImgWrap}>
                  {(l as any).position_img ? <img src={(l as any).position_img} alt="" className={styles.cardImg} />
                    : (l as any).aim_img ? <img src={(l as any).aim_img} alt="" className={styles.cardImg} />
                    : <div className={styles.cardImgEmpty}>🎯</div>}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{l.title}</div>
                  <div className={styles.cardMeta}>难度 {l.difficulty || 3}/5 · {l.views} 浏览</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 社区动态 */}
      {activities.length > 0 && (
        <div className={styles.feed}>
          <div className={styles.feedTitle}>📡 社区动态</div>
          {activities.slice(0, 6).map((a, i) => (
            <div key={i} className={styles.feedItem}>
              <div className={styles.feedAvatar}>{a.user_id?.slice(0, 2) || '?'}</div>
              <span className={styles.feedAction}>
                {a.action === '发布了' && <>发布了{a.target_type === 'tactic' ? '战术' : a.target_type === 'post' ? '帖子' : '点位'} <b>{a.title}</b></>}
                {a.action === '破百赞' && <>战术 <b>{a.title}</b> 点赞破百</>}
              </span>
              <span className={styles.feedTime}>{new Date(a.created_at).toLocaleDateString('zh')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
