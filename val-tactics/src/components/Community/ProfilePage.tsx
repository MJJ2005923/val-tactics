import { useState, useEffect } from 'react'
import { getProfile, getProfileStats, updateProfile, uploadAvatar } from '../../lib/community/profiles'
import { getFollowerCount, getFollowingCount } from '../../lib/community/follows'
import { getTactics } from '../../lib/community/tactics'
import { getPosts } from '../../lib/community/posts'
import { getLineups } from '../../lib/community/lineups'
import type { Profile, TacticalShare, Post, Lineup } from '../../types/community'
import { useAuth } from '../../store/AuthContext'
import FollowButton from './FollowButton'
import LikeButton from './LikeButton'
import FavoriteProfileButton from './FavoriteProfileButton'
import styles from './ProfilePage.module.css'

interface Props {
  userId: string
  onBack: () => void
  onViewTactic?: (id: string) => void
  onViewPost?: (id: string) => void
  onViewLineup?: (id: string) => void
}

export default function ProfilePage({ userId, onBack, onViewTactic, onViewPost, onViewLineup }: Props) {
  const { user, signOut, resetPassword } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [stats, setStats] = useState({ tacticCount: 0, postCount: 0, lineupCount: 0, totalLikes: 0, favoriteCount: 0 })
  const [subInfo, setSubInfo] = useState({ tier: 'free', leftDays: 0 })
  const [tab, setTab] = useState<'tactics' | 'posts' | 'lineups'>('tactics')
  const [tactics, setTactics] = useState<TacticalShare[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')

  const startEdit = () => {
    setEditName(profile?.username?.split('@')[0] || '')
    setEditBio(profile?.bio || '')
    setEditing(true)
  }
  const saveEdit = async () => {
    if (!editName.trim() || !user) return
    await updateProfile(user.id, { username: editName.trim(), bio: editBio.trim() })
    setProfile(p => p ? { ...p, username: editName.trim(), bio: editBio.trim() } : null)
    setEditing(false)
  }

  useEffect(() => {
    (async () => {
      const [prof, fc, fgc, st] = await Promise.all([
        getProfile(userId),
        getFollowerCount(userId),
        getFollowingCount(userId),
        getProfileStats(userId).catch(() => ({ tacticCount: 0, postCount: 0, lineupCount: 0, totalLikes: 0, favoriteCount: 0 })),
      ])
      setProfile(prof)
      setFollowerCount(fc)
      setFollowingCount(fgc)
      setStats(st)

      // 套餐信息（本地计算）
      const tier = localStorage.getItem('val-tactics-tier') || 'free'
      const ts = parseInt(localStorage.getItem('val-tactics-tier-at') || '0')
      const leftDays = ts ? Math.max(0, Math.ceil((ts + 30 * 86400000 - Date.now()) / 86400000)) : 0
      setSubInfo({ tier, leftDays })

      // 内容列表
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
        {/* 头部 */}
        <div className={styles.header}>
          {editing ? (
            <label className={styles.avatarUpload}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
              ) : (
                <span>{(editName || profile.username || '用')[0]}</span>
              )}
              <span className={styles.avatarOverlay}>更换</span>
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !user) return
                  const url = await uploadAvatar(user.id, file)
                  if (url) setProfile(p => p ? { ...p, avatar_url: url } : null)
                }} />
            </label>
          ) : (
            <div className={styles.avatar}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
              ) : (
                (profile.username || '用')[0]
              )}
            </div>
          )}
          <div className={styles.info}>
            {editing ? (
              <>
                <input className={styles.editInput} value={editName} onChange={e => setEditName(e.target.value)} maxLength={20} placeholder="昵称" />
                <textarea className={styles.editInput} value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={100} placeholder="简介..." style={{ height: 40, resize: 'none' }} />
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button className={styles.editBtn} onClick={saveEdit}>保存</button>
                  <button className={styles.editBtnCancel} onClick={() => setEditing(false)}>取消</button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.username}>{profile.username?.split('@')[0] || '用户'}</div>
                {profile.bio && <div className={styles.bio}>{profile.bio}</div>}
              </>
            )}
          </div>
          {user && user.id === userId && !editing && (
            <button className={styles.editBtn} onClick={startEdit} style={{ flexShrink: 0 }}>编辑</button>
          )}
          {user && user.id !== userId && <FollowButton targetUserId={userId} />}
        </div>

        {/* 套餐条 — 仅自己可见 */}
        {user && user.id === userId && (
          <div className={styles.subscription}>
            {subInfo.tier === 'free'
              ? '免费版 · 5次/天 · 升级解锁全部模式'
              : `标准版 · 剩余 ${subInfo.leftDays} 天`}
          </div>
        )}

        {/* 账户设置 — 仅自己 */}
        {user && user.id === userId && (
          <div className={styles.settings}>
            <div className={styles.settingsTitle}>账户设置</div>
            <div className={styles.settingsRow}>
              <button className={styles.settingsBtn}
                onClick={() => {
                  if (confirm('重置密码链接将发送到您的注册邮箱，确认？')) {
                    resetPassword(user.email!).then((r: any) => {
                      if (r?.error) alert(r.error)
                      else alert('重置链接已发送，请查收邮件')
                    })
                  }
                }}>
                重置密码
              </button>
              <button className={styles.settingsBtnDanger}
                onClick={() => {
                  if (confirm('确定退出登录？')) signOut()
                }}>
                退出登录
              </button>
            </div>
          </div>
        )}

        {/* 统计 2行6项 */}
        <div className={styles.statsGrid}>
          <div className={styles.statItem}><div className={styles.statNum}>{stats.tacticCount}</div><div className={styles.statLabel}>战术</div></div>
          <div className={styles.statItem}><div className={styles.statNum}>{stats.postCount + stats.lineupCount}</div><div className={styles.statLabel}>点位/帖子</div></div>
          <div className={styles.statItem}><div className={styles.statNum}>{stats.totalLikes}</div><div className={styles.statLabel}>获赞</div></div>
          <div className={styles.statItem}><div className={styles.statNum}>{stats.favoriteCount}</div><div className={styles.statLabel}>被收藏</div></div>
          <div className={styles.statItem}><div className={styles.statNum}>{followerCount}</div><div className={styles.statLabel}>粉丝</div></div>
          <div className={styles.statItem}><div className={styles.statNum}>{followingCount}</div><div className={styles.statLabel}>关注</div></div>
        </div>

        {/* 操作按钮 */}
        <div className={styles.actions}>
          <FollowButton targetUserId={userId} />
          <LikeButton targetType="profile" targetId={userId} targetUserId={userId} initialLiked={false} likeCount={0} />
          <FavoriteProfileButton targetUserId={userId} count={stats.favoriteCount} />
        </div>

        {/* Tab */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'tactics' ? styles.tabActive : ''}`} onClick={() => setTab('tactics')}>战术 ({stats.tacticCount})</button>
          <button className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`} onClick={() => setTab('posts')}>帖子 ({stats.postCount})</button>
          <button className={`${styles.tab} ${tab === 'lineups' ? styles.tabActive : ''}`} onClick={() => setTab('lineups')}>点位 ({stats.lineupCount})</button>
        </div>

        {/* 列表 */}
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
