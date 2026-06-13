import { useState, useEffect, useRef } from 'react'
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
  const [zoomScale, setZoomScale] = useState(1)
  const [zoomPan, setZoomPan] = useState({ x: 0, y: 0 })
  const zoomDragging = useRef(false)
  const zoomLast = useRef({ x: 0, y: 0 })

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

        {/* 地图坐标可视化 */}
        {(lineup.start_x != null || lineup.target_x != null) && (
          <div style={{
            position: 'relative', borderRadius: 12, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.06)', marginBottom: 16,
          }}>
            <img src={`/images/maps/${lineup.map_id}.png`} alt="" style={{ width: '100%', display: 'block' }} />
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
              {lineup.start_x != null && lineup.start_y != null && (
                <>
                  <circle cx={`${lineup.start_x * 100}%`} cy={`${lineup.start_y * 100}%`} r="6" fill="#05F8F8" stroke="#fff" strokeWidth="2" />
                  <text x={`${lineup.start_x * 100}%`} y={`${lineup.start_y * 100 - 2}%`} fill="#fff" fontSize="10" textAnchor="middle"
                    style={{ textShadow: '0 1px 3px black', paintOrder: 'stroke', stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 }}>站位</text>
                </>
              )}
              {lineup.target_x != null && lineup.target_y != null && (
                <>
                  <circle cx={`${lineup.target_x * 100}%`} cy={`${lineup.target_y * 100}%`} r="6" fill="#E349ED" stroke="#fff" strokeWidth="2" />
                  <text x={`${lineup.target_x * 100}%`} y={`${lineup.target_y * 100 - 2}%`} fill="#fff" fontSize="10" textAnchor="middle"
                    style={{ textShadow: '0 1px 3px black', paintOrder: 'stroke', stroke: 'rgba(0,0,0,.6)', strokeWidth: 3 }}>落点</text>
                </>
              )}
              {lineup.start_x != null && lineup.start_y != null && lineup.target_x != null && lineup.target_y != null && (
                <line x1={`${lineup.start_x * 100}%`} y1={`${lineup.start_y * 100}%`} x2={`${lineup.target_x * 100}%`} y2={`${lineup.target_y * 100}%`}
                  stroke="#f0c0ff" strokeWidth="1.5" strokeDasharray="4,3" opacity=".7" />
              )}
            </svg>
          </div>
        )}
        {/* 坐标文字 */}
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

      {/* 全屏图片查看器（缩放+拖拽） */}
      {zoomImg && (
        <div className={styles.zoom}
          onClick={(e) => { if (e.target === e.currentTarget) { setZoomImg(''); setZoomScale(1) } }}
          onWheel={(e) => {
            e.preventDefault()
            setZoomScale(s => Math.max(0.5, Math.min(5, s + (e.deltaY > 0 ? -0.3 : 0.3))))
          }}
          onMouseDown={(e) => { zoomDragging.current = true; zoomLast.current = { x: e.clientX, y: e.clientY } }}
          onMouseMove={(e) => {
            if (!zoomDragging.current) return
            const dx = e.clientX - zoomLast.current.x
            const dy = e.clientY - zoomLast.current.y
            zoomLast.current = { x: e.clientX, y: e.clientY }
            setZoomPan(p => ({ x: p.x + dx, y: p.y + dy }))
          }}
          onMouseUp={() => { zoomDragging.current = false }}
          onMouseLeave={() => { zoomDragging.current = false }}
        >
          <img src={zoomImg} alt="" style={{
            transform: `translate(${zoomPan.x}px, ${zoomPan.y}px) scale(${zoomScale})`,
            cursor: zoomScale > 1 ? (zoomDragging.current ? 'grabbing' : 'grab') : 'default',
            transition: zoomDragging.current ? 'none' : 'transform .15s ease',
          }} />
          {/* 缩放控制栏 */}
          <div className={styles.zoomControls}>
            <button onClick={(e) => { e.stopPropagation(); setZoomScale(s => Math.max(0.5, s - 0.3)) }}>−</button>
            <span>{Math.round(zoomScale * 100)}%</span>
            <button onClick={(e) => { e.stopPropagation(); setZoomScale(s => Math.min(5, s + 0.3)) }}>+</button>
            <button onClick={(e) => { e.stopPropagation(); setZoomScale(1); setZoomPan({x:0,y:0}) }}>1:1</button>
            <button onClick={(e) => { e.stopPropagation(); setZoomImg(''); setZoomScale(1) }}>x</button>
          </div>
        </div>
      )}
    </div>
  )
}
