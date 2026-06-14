import { useState, useEffect } from 'react'
import { getTactic, deleteTactic } from '../../lib/community/tactics'
import { getProfile } from '../../lib/community/profiles'
import { isAdmin as isAdminUser } from '../../lib/adminAuth'
import { useAuth } from '../../store/AuthContext'
import type { TacticalShare, Profile } from '../../types/community'
import maps from '../../data/maps'
import LikeButton from './LikeButton'
import FollowButton from './FollowButton'
import FavoriteButton from './FavoriteButton'
import CommentSection from './CommentSection'
import styles from './TacticsDetail.module.css'

interface Props {
  tacticId: string
  onBack: () => void
  onLoadToBoard: (data: Record<string, unknown>, mapId: string) => void
  onViewProfile?: (uid: string) => void
  embedded?: boolean
}

export default function TacticsDetail({ tacticId, onBack, onLoadToBoard, onViewProfile, embedded }: Props) {
  const { user } = useAuth(); const isAdmin = isAdminUser()
  const [tactic, setTactic] = useState<TacticalShare | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleted, setDeleted] = useState(false)

  useEffect(() => {
    (async () => {
      const t = await getTactic(tacticId)
      if (!t) { setDeleted(true); setLoading(false); return }
      setTactic(t)
      const p = await getProfile(t.user_id)
      setAuthor(p)
      setLoading(false)
    })()
  }, [tacticId])

  const handleDelete = async () => {
    if (!tactic || !user) return
    if (user.id !== tactic.user_id && !isAdmin) return
    if (!confirm('确定删除这条战术分享？')) return
    await deleteTactic(tactic.id)
    setDeleted(true)
  }

  const handleLoad = () => {
    if (!tactic) return
    onLoadToBoard(tactic.tactic_data, tactic.map_id)
  }

  if (loading) return <div className={embedded ? styles.overlayEmbedded : styles.overlay}><div className={styles.topBar}>{!embedded ? <button className={styles.backBtn} onClick={onBack}>← 返回</button> : null}</div><div className={styles.loading}>加载中…</div></div>
  if (deleted || !tactic) return <div className={embedded ? styles.overlayEmbedded : styles.overlay}><div className={styles.topBar}>{!embedded ? <button className={styles.backBtn} onClick={onBack}>← 返回</button> : null}</div><div className={styles.deleted}>战术已删除或不存在</div></div>

  const mapName = maps.find(m => m.id === tactic.map_id)?.name || tactic.map_id
  const data = tactic.tactic_data as any

  return (
    <div className={embedded ? styles.overlayEmbedded : styles.overlay}>
      <div className={styles.topBar}>
        {<button className={styles.backBtn} onClick={onBack}>← 返回广场</button>}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.mapTag}>{mapName}</div>
          <h1 className={styles.tacticTitle}>{tactic.title}</h1>
          {tactic.description && <p className={styles.tacticDesc}>{tactic.description}</p>}
        </div>

        {tactic.preview_image && (
          <img src={tactic.preview_image} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, border: '1px solid rgba(255,255,255,.04)' }} />
        )}

        {/* 点位图组 */}
        {tactic.lineup_images && tactic.lineup_images.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>点位图 ({tactic.lineup_images.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {tactic.lineup_images.map((url, i) => (
                <img key={i} src={url} alt={`点位${i+1}`} style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }}
                  onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          </div>
        )}

        {/* 预览效果图组 */}
        {tactic.effect_images && tactic.effect_images.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginBottom: 8 }}>效果预览 ({tactic.effect_images.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {tactic.effect_images.map((url, i) => (
                <img key={i} src={url} alt={`效果${i+1}`} style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }}
                  onClick={() => window.open(url, '_blank')} />
              ))}
            </div>
          </div>
        )}

        <div className={styles.actionBar}>
          <div className={styles.authorInfo}>
            <span className={styles.authorName} style={{ cursor: 'pointer' }} onClick={() => onViewProfile?.(tactic.user_id)}>{author?.username?.split('@')[0] || '用户'}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>
              {new Date(tactic.created_at).toLocaleDateString('zh')} · {tactic.views} 浏览 · {tactic.like_count} 赞 · {(tactic as any).favorite_count || 0} 收藏
            </span>
          </div>
          <div className={styles.actionBtns}>
            <LikeButton targetType="tactic" targetId={tactic.id} targetUserId={tactic.user_id} initialLiked={!!(tactic as any).liked} likeCount={tactic.like_count || 0} />
            <FavoriteButton targetType="tactic" targetId={tactic.id} initialCount={(tactic as any).favorite_count || 0} />
            <FollowButton targetUserId={tactic.user_id} />
            <button className={styles.loadBtn} onClick={handleLoad}>📥 加载到战术板</button>
            {user && (user.id === tactic.user_id || isAdmin) && (
              <button className={styles.actionBtn} onClick={handleDelete} style={{ color: isAdmin && user.id !== tactic.user_id ? '#f0c0ff' : '#ff5555' }}>删除</button>
            )}
          </div>
        </div>

        {/* 战术内容预览 */}
        {data && (
          <div className={styles.preview}>
            <div className={styles.previewTitle}>战术内容预览</div>
            <div className={styles.previewGrid}>
              {data.mk && <div className={styles.previewItem}><b>技能标记</b>{data.mk.length} 个</div>}
              {data.dr && <div className={styles.previewItem}><b>绘图</b>{data.dr.length} 条</div>}
              {data.tx && <div className={styles.previewItem}><b>文字标注</b>{data.tx.length} 个</div>}
              {data.ap && <div className={styles.previewItem}><b>特工站位</b>{data.ap.length} 个</div>}
              {data.as && <div className={styles.previewItem}><b>技能范围</b>{data.as.length} 个</div>}
              {data.name && <div className={styles.previewItem}><b>战术名称</b>{data.name}</div>}
              {data.lineupCount > 0 && <div className={styles.previewItem}><b>点位数量</b>{data.lineupCount} 个</div>}
            </div>
          </div>
        )}

        <CommentSection targetType="tactic" targetId={tactic.id} />
      </div>
    </div>
  )
}
