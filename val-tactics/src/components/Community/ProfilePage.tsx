import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
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
import FollowListPopup from './FollowListPopup'
import CommentSection from './CommentSection'
import styles from './ProfilePage.module.css'

interface Props {
  userId: string
  onBack: () => void
  onViewTactic?: (id: string) => void
  onViewPost?: (id: string) => void
  onViewLineup?: (id: string) => void
  embedded?: boolean
}

export default function ProfilePage({ userId, onBack, onViewTactic, onViewPost, onViewLineup, embedded }: Props) {
  const { user, signOut, resetPassword } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [stats, setStats] = useState({ tacticCount: 0, postCount: 0, lineupCount: 0, totalLikes: 0, favoriteCount: 0 })
  const [subInfo, setSubInfo] = useState({ tier: 'free', leftDays: 0 })
  const [tab, setTab] = useState<'tactics' | 'posts' | 'lineups' | 'likes' | 'favs'>('tactics')
  const [tactics, setTactics] = useState<TacticalShare[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [likedItems, setLikedItems] = useState<{ id: string; title: string; type: string; date: string; views?: number; like_count?: number; comment_count?: number }[]>([])
  const [favedItems, setFavedItems] = useState<{ id: string; title: string; type: string; date: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [followPopup, setFollowPopup] = useState<'followers' | 'following' | null>(null)
  const [showFollows, setShowFollows] = useState(true)

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
      if (prof?.show_follows !== undefined) setShowFollows(prof.show_follows)

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

      // 用户点赞/收藏的内容
      const { data: likes } = await supabase.from('likes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      if (likes) {
        const tacticLikes = likes.filter((l: any) => l.target_type === 'tactic')
        const postLikes = likes.filter((l: any) => l.target_type === 'post')
        const lineupLikes = likes.filter((l: any) => l.target_type === 'lineup')
        const items: any[] = []
        for (const l of tacticLikes) {
          const { data: d } = await supabase.from('tactical_shares').select('id,title,created_at,views,like_count,comment_count').eq('id', l.target_id).maybeSingle()
          if (d) items.push({ ...d, type: '战术' })
        }
        for (const l of postLikes) {
          const { data: d } = await supabase.from('posts').select('id,title,created_at,views,like_count,comment_count').eq('id', l.target_id).maybeSingle()
          if (d) items.push({ ...d, type: '帖子' })
        }
        for (const l of lineupLikes) {
          const { data: d } = await supabase.from('lineups').select('id,title,created_at,views,like_count,comment_count').eq('id', l.target_id).maybeSingle()
          if (d) items.push({ ...d, type: '点位' })
        }
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setLikedItems(items)
      }

      // 收藏 = content_favorites（通用）+ lineup_favorites（旧兼容）
      const [cfResult, lfResult] = await Promise.all([
        supabase.from('content_favorites').select('target_type,target_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('lineup_favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ])
      const favItems: any[] = []
      const addedIds2 = new Set<string>()
      for (const f of (cfResult.data || [])) {
        const table = f.target_type === 'tactic' ? 'tactical_shares' : f.target_type === 'post' ? 'posts' : 'lineups'
        const typeLabel = f.target_type === 'tactic' ? '战术' : f.target_type === 'post' ? '帖子' : '点位'
        const { data: d } = await supabase.from(table).select('id,title,created_at').eq('id', f.target_id).maybeSingle()
        if (d && !addedIds2.has(`${f.target_type}:${f.target_id}`)) {
          addedIds2.add(`${f.target_type}:${f.target_id}`)
          favItems.push({ ...d, type: typeLabel })
        }
      }
      for (const f of (lfResult.data || [])) {
        if (addedIds2.has(`lineup:${f.lineup_id}`)) continue
        addedIds2.add(`lineup:${f.lineup_id}`)
        const { data: d } = await supabase.from('lineups').select('id,title,created_at').eq('id', f.lineup_id).maybeSingle()
        if (d) favItems.push({ ...d, type: '点位' })
      }
      setFavedItems(favItems)

      setLoading(false)
    })()
  }, [userId])

  if (loading) return <div className={embedded ? styles.pageEmbedded : styles.page}><div className={styles.topBar}>{!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}</div><div className={styles.loading}>加载中...</div></div>
  if (!profile) return <div className={embedded ? styles.pageEmbedded : styles.page}><div className={styles.topBar}>{!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}</div><div className={styles.empty}>用户不存在</div></div>

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      <div className={styles.topBar}>
        {!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}
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
                <div className={styles.username}>
                {profile.username?.split('@')[0] || '用户'}
                {profile.is_admin && (
                  <span className={styles.adminBadge}>DEV</span>
                )}
              </div>
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
            <div className={styles.settingsRow} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.4)', cursor: 'pointer' }}>
                <span>{showFollows ? '公开关注列表' : '隐藏关注列表'}</span>
                <input type="checkbox" checked={showFollows} onChange={async () => {
                  const next = !showFollows
                  setShowFollows(next)
                  await supabase.from('profiles').update({ show_follows: next }).eq('id', userId)
                }} style={{ accentColor: '#E349ED' }} />
              </label>
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

        {/* 统计 2行6项 — 点击跳转对应 Tab */}
        <div className={styles.statsGrid}>
          <div className={styles.statItem} onClick={() => setTab('tactics')} style={{ cursor: 'pointer' }} title="查看发布的战术">
            <div className={styles.statNum}>{stats.tacticCount}</div><div className={styles.statLabel}>战术</div>
          </div>
          <div className={styles.statItem} onClick={() => setTab('posts')} style={{ cursor: 'pointer' }} title="查看帖子/点位">
            <div className={styles.statNum}>{stats.postCount + stats.lineupCount}</div><div className={styles.statLabel}>点位/帖子</div>
          </div>
          <div className={styles.statItem} onClick={() => setTab('likes')} style={{ cursor: 'pointer' }} title="查看赞过的内容">
            <div className={styles.statNum}>{stats.totalLikes}</div><div className={styles.statLabel}>获赞</div>
          </div>
          <div className={styles.statItem} onClick={() => setTab('favs')} style={{ cursor: 'pointer' }} title="查看收藏的内容">
            <div className={styles.statNum}>{stats.favoriteCount}</div><div className={styles.statLabel}>被收藏</div>
          </div>
          <div className={styles.statItem} onClick={() => setFollowPopup('followers')} style={{ cursor: 'pointer' }} title="查看粉丝列表">
            <div className={styles.statNum}>{followerCount}</div><div className={styles.statLabel}>粉丝</div>
          </div>
          <div className={styles.statItem} onClick={() => setFollowPopup('following')} style={{ cursor: 'pointer' }} title="查看关注列表">
            <div className={styles.statNum}>{followingCount}</div><div className={styles.statLabel}>关注</div>
          </div>
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
          <button className={`${styles.tab} ${tab === 'likes' ? styles.tabActive : ''}`} onClick={() => setTab('likes')}>赞过 ({likedItems.length})</button>
          <button className={`${styles.tab} ${tab === 'favs' ? styles.tabActive : ''}`} onClick={() => setTab('favs')}>收藏 ({favedItems.length})</button>
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
          {tab === 'likes' && (likedItems.length === 0 ? <div className={styles.empty}>还没有赞过内容</div> :
            likedItems.map((item: any) => (
              <div key={item.id} className={styles.item} onClick={() => {
                if (item.type === '战术') onViewTactic?.(item.id)
                else if (item.type === '帖子') onViewPost?.(item.id)
                else if (item.type === '点位') onViewLineup?.(item.id)
              }}>
                <div className={styles.itemTitle}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginRight: 6 }}>[{item.type}]</span>
                  {item.title}
                </div>
                <div className={styles.itemMeta}>
                  <span>{new Date(item.created_at).toLocaleDateString('zh')}</span>
                  {item.views != null && <span>{item.views} 浏览</span>}
                  {item.like_count != null && <span>{item.like_count} 赞</span>}
                  {item.comment_count != null && <span>{item.comment_count} 评论</span>}
                </div>
              </div>
            ))
          )}
          {tab === 'favs' && (favedItems.length === 0 ? <div className={styles.empty}>还没有收藏内容</div> :
            favedItems.map((item: any) => (
              <div key={item.id} className={styles.item} onClick={() => onViewLineup?.(item.id)}>
                <div className={styles.itemTitle}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginRight: 6 }}>[{item.type}]</span>
                  {item.title}
                </div>
                <div className={styles.itemMeta}>
                  <span>{new Date(item.created_at).toLocaleDateString('zh')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 留言板 */}
        <CommentSection targetType="profile" targetId={userId} title="留言板" />
      </div>

      {/* 关注/粉丝弹窗 */}
      {followPopup && (
        <FollowListPopup
          userId={userId}
          type={followPopup}
          onClose={() => setFollowPopup(null)}
          onViewProfile={() => setFollowPopup(null)}
        />
      )}
    </div>
  )
}
