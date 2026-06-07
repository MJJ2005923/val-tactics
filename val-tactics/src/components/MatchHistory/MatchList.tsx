import { useState } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { loadMatches, deleteMatch } from '../../data/matchHistory'
import MatchForm from './MatchForm'
import type { MatchEntry } from '../../types'
import styles from './MatchList.module.css'

interface Props {
  compact?: boolean
}

export default function MatchList({ compact }: Props) {
  const [matches, setMatches] = useState<MatchEntry[]>(loadMatches)
  const [editEntry, setEditEntry] = useState<MatchEntry | null>(null)

  const refresh = () => setMatches(loadMatches())

  const handleDelete = (id: string) => {
    if (!window.confirm('确认删除这场比赛记录？')) return
    const updated = deleteMatch(id)
    setMatches(updated)
  }

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  const cls = `${styles.list} ${compact ? styles.compact : ''}`

  if (matches.length === 0) {
    return (
      <div className={cls}>
        <div className={styles.empty}>
          还没有比赛记录<br />
          切换到「录入」添加第一场
        </div>
      </div>
    )
  }

  return (
    <div className={cls}>
      {matches.map(m => (
        <div key={m.id} className={styles.card}>
          <div className={`${styles.resultBadge} ${m.result === 'win' ? styles.resultWin : m.result === 'loss' ? styles.resultLoss : styles.resultDraw}`}>
            {m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'}
          </div>

          <div className={styles.info}>
            <div className={styles.topRow}>
              <span className={styles.mapName}>{mapName(m.mapId)}</span>
              <span className={styles.agentName}>{agentName(m.agentId)}</span>
              <span className={`${styles.sideTag} ${m.side === 'attack' ? styles.sideAttack : styles.sideDefense}`}>
                {m.side === 'attack' ? '攻' : '守'}
              </span>
            </div>
            <div className={styles.kda}>
              KDA {m.kills}/{m.deaths}/{m.assists}
              {m.acs && ` · ACS ${m.acs}`}
            </div>
            <div className={styles.bottomRow}>
              <span>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
              {m.rank && <span>{m.rank}</span>}
              {m.notes && <span>📝 {m.notes.slice(0, 20)}{m.notes.length > 20 ? '...' : ''}</span>}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => setEditEntry(m)} title="编辑">✏️</button>
            <button className={styles.actionBtn} onClick={() => handleDelete(m.id)} title="删除">🗑️</button>
          </div>
        </div>
      ))}

      {editEntry && (
        <div className={styles.editOverlay} onClick={() => setEditEntry(null)}>
          <div className={styles.editModal} onClick={e => e.stopPropagation()}>
            <MatchForm
              editEntry={editEntry}
              onEditSaved={() => { setEditEntry(null); refresh() }}
            />
            <button
              style={{
                width: '100%', marginTop: 8, padding: 6,
                background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 4, color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
              onClick={() => setEditEntry(null)}
            >取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
