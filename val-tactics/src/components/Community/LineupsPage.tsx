import { useState, useEffect, useCallback } from 'react'
import { getLineups } from '../../lib/community/lineups'
import { getProfiles } from '../../lib/community/profiles'
import type { Lineup, Profile } from '../../types/community'
import maps from '../../data/maps'
import agents from '../../data/agents'
import styles from './LineupsPage.module.css'

interface Props {
  onBack: () => void
  onViewLineup: (id: string) => void
  onCreateLineup: () => void
  embedded?: boolean
}

export default function LineupsPage({ onBack, onViewLineup, onCreateLineup, embedded }: Props) {
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [mapFilter, setMapFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getLineups({ pageSize: 1000, mapId: mapFilter || undefined, agentId: agentFilter || undefined })
      setLineups(r.data)
      const ids = [...new Set(r.data.map(l => l.user_id))]
      if (ids.length > 0) {
        const profs = await getProfiles(ids)
        const map: Record<string, Profile> = {}
        profs.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    } catch {}
    setLoading(false)
  }, [mapFilter, agentFilter])

  useEffect(() => { load() }, [load])

  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id
  const abilityName = (agentId: string, abilityId: string) => {
    const a = agents.find(a => a.id === agentId)
    return a?.abilities.find(ab => ab.id === abilityId)?.name || abilityId
  }

  return (
    <div className={embedded ? styles.pageEmbedded : styles.page}>
      <div className={styles.topBar}>
        {!embedded && <button className={styles.backBtn} onClick={onBack}>返回</button>}
        <input className={styles.searchInput} placeholder="搜索点位..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.sortBtns}>
          <button className={`${styles.sortBtn} ${sort === 'latest' ? styles.sortBtnActive : ''}`} onClick={() => setSort('latest')}>最新</button>
          <button className={`${styles.sortBtn} ${sort === 'hot' ? styles.sortBtnActive : ''}`} onClick={() => setSort('hot')}>最热</button>
        </div>
        <select className={styles.filterSelect} value={mapFilter} onChange={e => setMapFilter(e.target.value)}>
          <option value="">全部地图</option>
          {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className={styles.filterSelect} value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
          <option value="">全部特工</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className={styles.createBtn} onClick={onCreateLineup}>发布点位</button>
      </div>

      {loading && <div className={styles.empty}>加载中...</div>}
      {!loading && (() => {
        const filtered = search ? lineups.filter(l => l.title.toLowerCase().includes(search.toLowerCase()) || (l as any).description?.toLowerCase().includes(search.toLowerCase())) : lineups
        const sorted = sort === 'hot'
          ? [...filtered].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
          : filtered
        if (sorted.length === 0) return <div className={styles.empty}>{search ? '没有匹配的点位' : '还没有点位，快来发布第一个'}</div>
        return (
        <div className={styles.grid}>
          {sorted.map(l => (
            <div key={l.id} className={styles.card} onClick={() => onViewLineup(l.id)}>
              <img className={styles.cardImg} src={l.effect_img || l.position_img || ''} alt="" />
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardMap}>{maps.find(m => m.id === l.map_id)?.name}</span>
                  <span className={styles.cardAgent}>{agentName(l.agent_id)} - {abilityName(l.agent_id, l.ability_id)}</span>
                </div>
                <div className={styles.cardTitle}>{l.title}</div>
                {l.description && <div className={styles.cardDesc}>{l.description.slice(0, 60)}</div>}
                <div className={styles.cardMeta}>
                  <span className={styles.diff}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} className={i <= l.difficulty ? styles.diffStarActive : styles.diffStar}>{'*'}</span>
                    ))}
                  </span>
                  <span>{l.views} 浏览</span>
                  <span>{l.like_count} 赞</span>
                  <span>{profiles[l.user_id]?.username?.split('@')[0] || '用户'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
      })()}
    </div>
  )
}
