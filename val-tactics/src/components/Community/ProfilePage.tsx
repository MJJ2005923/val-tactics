import { useState, useEffect } from 'react'
import { getProfile } from '../../lib/community/profiles'
import { getFollowerCount, getFollowingCount } from '../../lib/community/follows'
import { getTactics } from '../../lib/community/tactics'
import { getPosts } from '../../lib/community/posts'
import { getLineups } from '../../lib/community/lineups'
import type { Profile, TacticalShare, Post, Lineup } from '../../types/community'
import FollowButton from './FollowButton'
import styles from './ProfilePage.module.css'

interface Props {
  userId: string
  onBack: () => void
  onViewTactic?: (id: string) => void
  onViewPost?: (id: string) => void
  onViewLineup?: (id: string) => void
}

export default function ProfilePage({ userId, onBack, onViewTactic, onViewPost, onViewLineup }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [tab, setTab] = useState<'tactics' | 'posts' | 'lineups'>('tactics')
  const [tactics, setTactics] = useState<TacticalShare[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [prof, fc, fgc] = await Promise.all([
        getProfile(userId),
        getFollowerCount(userId),
        getFollowingCount(userId),
      ])
      setProfile(prof)
      setFollowerCount(fc)
      setFollowingCount(fgc)
      const [tr, pr, lr] = await Promise.all([
        getTactics({ pageSize: 100 }),
        getPosts({ pageSize: 100 }),
        getLineups({ pageSize: 100 }),
      ])
      setTactics(tr.data.filter(t => t.user_id === userId))
      setPosts(pr.data.filter(p => p.user_id === userId))
      setLineups(lr.data.filter(l => l.user_id === userId))
      setLoading(false)
    })()
  }, [userId])

  if (loading) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回</button></div><div className={styles.loading}>加载中...</div></div>
  if (!profile) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回</button></div><div className={styles.empty}>用户不存在</div></div>

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>返回</button>
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {(profile.username || '用')[0]}
          </div>
          <div className={styles.info}>
            <div className={styles.username}>{profile.username?.split('@')[0] || '用户'}</div>
            {profile.bio && <div className={styles.bio}>{profile.bio}</div>}
            <div className={styles.stats}>
              <div className={styles.stat}><div className={styles.statNum}>{tactics.length + posts.length + lineups.length}</div><div className={styles.statLabel}>内容</div></div>
              <div className={styles.stat}><div className={styles.statNum}>{followerCount}</div><div className={styles.statLabel}>粉丝</div></div>
              <div className={styles.stat}><div className={styles.statNum}>{followingCount}</div><div className={styles.statLabel}>关注</div></div>
            </div>
          </div>
          <FollowButton targetUserId={userId} />
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'tactics' ? styles.tabActive : ''}`} onClick={() => setTab('tactics')}>战术 ({tactics.length})</button>
          <button className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`} onClick={() => setTab('posts')}>帖子 ({posts.length})</button>
          <button className={`${styles.tab} ${tab === 'lineups' ? styles.tabActive : ''}`} onClick={() => setTab('lineups')}>点位 ({lineups.length})</button>
        </div>

        <div className={styles.list}>
          {tab === 'tactics' && (tactics.length === 0 ? <div className={styles.empty}>还没有分享战术</div> :
            tactics.map(t => (
              <div key={t.id} className={styles.item} onClick={() => onViewTactic?.(t.id)}>
                <div className={styles.itemTitle}>{t.title}</div>
                <div className={styles.itemMeta}>
                  <span>{new Date(t.created_at).toLocaleDateString('zh')}</span>
                  <span>{t.views} 浏览</span>
                  <span>{t.like_count} 赞</span>
                  <span>{t.comment_count} 评论</span>
                </div>
              </div>
            ))
          )}
          {tab === 'posts' && (posts.length === 0 ? <div className={styles.empty}>还没有发过帖子</div> :
            posts.map(p => (
              <div key={p.id} className={styles.item} onClick={() => onViewPost?.(p.id)}>
                <div className={styles.itemTitle}>{p.title}</div>
                <div className={styles.itemMeta}>
                  <span>{new Date(p.created_at).toLocaleDateString('zh')}</span>
                  <span>{p.views} 浏览</span>
                  <span>{p.like_count} 赞</span>
                  <span>{p.comment_count} 评论</span>
                </div>
              </div>
            ))
          )}
          {tab === 'lineups' && (lineups.length === 0 ? <div className={styles.empty}>还没有发布点位</div> :
            lineups.map(l => (
              <div key={l.id} className={styles.item} onClick={() => onViewLineup?.(l.id)}>
                <div className={styles.itemTitle}>{l.title}</div>
                <div className={styles.itemMeta}>
                  <span>{new Date(l.created_at).toLocaleDateString('zh')}</span>
                  <span>{l.views} 浏览</span>
                  <span>{l.like_count} 赞</span>
                  <span>{l.comment_count} 评论</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
