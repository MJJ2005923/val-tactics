import { useState, useEffect } from 'react'
import { getLineup, deleteLineup } from '../../lib/community/lineups'
import { getProfile } from '../../lib/community/profiles'
import { useAuth } from '../../store/AuthContext'
import type { Lineup, Profile } from '../../types/community'
import maps from '../../data/maps'
import agents from '../../data/agents'
import LikeButton from './LikeButton'
import FollowButton from './FollowButton'
import CommentSection from './CommentSection'
import styles from './LineupsDetail.module.css'

interface Props {
  lineupId: string
  onBack: () => void
}

export default function LineupsDetail({ lineupId, onBack }: Props) {
  const { user } = useAuth()
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState(false)
  const [zoomImg, setZoomImg] = useState('')

  useEffect(() => {
    (async () => {
      const l = await getLineup(lineupId)
      if (!l) { setDeleted(true); setLoading(false); return }
      setLineup(l)
      const p = await getProfile(l.user_id)
      setAuthor(p)
      setLoading(false)
    })()
  }, [lineupId])

  const isAdmin = !!sessionStorage.getItem('admin-key')

  const handleDelete = async () => {
    if (!lineup || !user) return
    if (user.id !== lineup.user_id && !isAdmin) return
    if (!confirm('确定删除？')) return
    await deleteLineup(lineup.id, lineup.user_id)
    setDeleted(true)
  }

  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id
  const abilityName = (agentId: string, abilityId: string) => {
    const a = agents.find(aa => aa.id === agentId)
    return a?.abilities.find(ab => ab.id === abilityId)?.name || abilityId
  }

  if (loading) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回</button></div><div className={styles.loading}>加载中...</div></div>
  if (deleted || !lineup) return <div className={styles.page}><div className={styles.topBar}><button className={styles.backBtn} onClick={onBack}>返回</button></div><div className={styles.deleted}>点位已删除或不存在</div></div>

  const images = [
    { label: '站位', url: lineup.position_img },
    { label: '瞄点', url: lineup.aim_img },
    { label: '释放', url: lineup.release_img },
    { label: '效果', url: lineup.effect_img },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>返回</button>
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.mapTag}>{maps.find(m => m.id === lineup.map_id)?.name}</span>
          <span className={styles.agentTag}>{agentName(lineup.agent_id)} - {abilityName(lineup.agent_id, lineup.ability_id)}</span>
          <div className={styles.lineupTitle}>{lineup.title}</div>
          {lineup.description && <div className={styles.lineupDesc}>{lineup.description}</div>}
        </div>

        {/* 四宫格 */}
        <div className={styles.grid4}>
          {images.map(img => (
            <div key={img.label} className={styles.gridItem} onClick={() => img.url && setZoomImg(img.url)}>
              {img.url ? (
                <img src={img.url} alt={img.label} />
              ) : (
                <div className={styles.gridEmpty}>?</div>
              )}
              <div className={styles.gridLabel}>{img.label}</div>
            </div>
          ))}
        </div>

        {/* 坐标 */}
        {(lineup.start_x != null || lineup.target_x != null) && (
          <div className={styles.coords}>
            {lineup.start_x != null && <div className={styles.coordItem}><b>站位</b> ({lineup.start_x?.toFixed(1)}, {lineup.start_y?.toFixed(1)})</div>}
            {lineup.target_x != null && <div className={styles.coordItem}><b>落点</b> ({lineup.target_x?.toFixed(1)}, {lineup.target_y?.toFixed(1)})</div>}
          </div>
        )}

        <div className={styles.meta}>
          <span className={styles.author}>{author?.username?.split('@')[0] || '用户'}</span>
          <FollowButton targetUserId={lineup.user_id} />
          <span className={styles.diff}>{[1,2,3,4,5].map(i => (
            <span key={i} className={i <= lineup.difficulty ? styles.diffStarActive : styles.diffStar}>{'*'}</span>
          ))}</span>
          <span className={styles.date}>{new Date(lineup.created_at).toLocaleDateString('zh')} - {lineup.views} 浏览</span>
          <LikeButton targetType="lineup" targetId={lineup.id} targetUserId={lineup.user_id} initialLiked={false} likeCount={lineup.like_count} />
          {user && (user.id === lineup.user_id || isAdmin) && <button className={styles.delBtn} onClick={handleDelete} style={isAdmin && user.id !== lineup.user_id ? {color:'#f0c0ff'} : {}}>删除</button>}
        </div>

        <CommentSection targetType="lineup" targetId={lineup.id} />
      </div>

      {/* 全屏放大 */}
      {zoomImg && (
        <div className={styles.zoom} onClick={() => setZoomImg('')}>
          <img src={zoomImg} alt="" />
        </div>
      )}
    </div>
  )
}
