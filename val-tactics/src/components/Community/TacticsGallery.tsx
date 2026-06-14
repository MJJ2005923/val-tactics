import { useState, useEffect, useCallback } from 'react'
import { getTactics } from '../../lib/community/tactics'
import { getProfiles } from '../../lib/community/profiles'
import type { TacticalShare, Profile } from '../../types/community'
import maps from '../../data/maps'
import styles from './TacticsGallery.module.css'

interface Props {
  onBack: () => void
  onViewTactic: (id: string) => void
  onCreate: () => void
  onViewProfile?: (uid: string) => void
  embedded?: boolean
}

export default function TacticsGallery({ onBack, onViewTactic, onCreate, onViewProfile, embedded }: Props) {
  const [tactics, setTactics] = useState<TacticalShare[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [mapFilter, setMapFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTactics({ sort, mapId: mapFilter || undefined, search: search || undefined, pageSize: 36 })
      setTactics(result.data)
      // 批量查作者
      const ids = [...new Set(result.data.map(t => t.user_id))]
      if (ids.length > 0) {
        const profs = await getProfiles(ids)
        const map: Record<string, Profile> = {}
        profs.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [sort, mapFilter, search])

  useEffect(() => { load() }, [load])

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id

  return (
    <div className={embedded ? styles.overlayEmbedded : styles.overlay}>
      <div className={styles.topBar}>
        {!embedded && <button className={styles.backBtn} onClick={onBack}>← 返回</button>}
        <input
          className={styles.searchBox}
          placeholder="搜索战术…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.sortBtns}>
          <button className={`${styles.sortBtn} ${sort === 'latest' ? styles.sortBtnActive : ''}`} onClick={() => setSort('latest')}>最新</button>
          <button className={`${styles.sortBtn} ${sort === 'hot' ? styles.sortBtnActive : ''}`} onClick={() => setSort('hot')}>最热</button>
        </div>
        <button className={styles.createBtn} onClick={onCreate}>发布战术</button>
      </div>

      <div className={styles.mapFilter}>
        <button className={`${styles.mapChip} ${!mapFilter ? styles.mapChipActive : ''}`} onClick={() => setMapFilter('')}>全部</button>
        {maps.map(m => (
          <button key={m.id} className={`${styles.mapChip} ${mapFilter === m.id ? styles.mapChipActive : ''}`} onClick={() => setMapFilter(m.id)}>
            {m.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中…</div>
      ) : tactics.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyText}>还没有战术分享，快来发布第一个</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {tactics.map(t => (
            <div key={t.id} className={styles.card} onClick={() => onViewTactic(t.id)}>
              {t.preview_image ? (
                <img src={t.preview_image} alt="" className={styles.cardImg} />
              ) : (
                <div className={styles.cardImgPlaceholder}>📐</div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardMap}>{mapName(t.map_id)}</span>
                  <span className={styles.cardAuthor} onClick={(e) => { e.stopPropagation(); onViewProfile?.(t.user_id) }}>
                    {profiles[t.user_id]?.username?.split('@')[0] || '用户'}
                  </span>
                </div>
                <div className={styles.cardTitle}>{t.title}</div>
                {t.description && <div className={styles.cardDesc}>{t.description.slice(0, 60)}</div>}
                <div className={styles.cardStats}>
                  <span>{t.views} 浏览</span>
                  <span>{t.like_count} 赞</span>
                  <span>{t.comment_count} 评论</span>
                  <span>{(t as any).favorite_count || 0} 收藏</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
