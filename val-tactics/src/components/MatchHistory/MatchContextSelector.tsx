import { useState, useEffect } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { loadMatches } from '../../data/matchHistory'
import type { MatchEntry } from '../../types'
import styles from './MatchContextSelector.module.css'

export type MatchContextMode = 'none' | 'all' | 'single'

export interface MatchContextSelection {
  mode: MatchContextMode
  matchId?: string // 仅 mode='single' 时有效
}

const STORAGE_KEY = 'val-tactics-match-context'

/** 读取保存的数据引用设置 */
export function loadMatchContext(): MatchContextSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { mode: 'none' }
}

/** 保存数据引用设置 */
export function saveMatchContext(sel: MatchContextSelection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sel))
}

interface Props {
  onContextChange?: (sel: MatchContextSelection) => void
}

export default function MatchContextSelector({ onContextChange }: Props) {
  const [selection, setSelection] = useState<MatchContextSelection>(loadMatchContext)
  const [matches, setMatches] = useState<MatchEntry[]>(loadMatches)

  // 当切换到此组件时刷新比赛数据
  useEffect(() => {
    setMatches(loadMatches())
  }, [])

  const handleModeChange = (mode: MatchContextMode) => {
    const next: MatchContextSelection = mode === 'single' ? { mode, matchId: undefined } : { mode }
    setSelection(next)
    saveMatchContext(next)
    onContextChange?.(next)
  }

  const handleMatchSelect = (matchId: string) => {
    const next: MatchContextSelection = { mode: 'single', matchId }
    setSelection(next)
    saveMatchContext(next)
    onContextChange?.(next)
  }

  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  const modes: { key: MatchContextMode; label: string; desc: string }[] = [
    { key: 'none', label: '不引用', desc: '仅用知识库回答' },
    { key: 'all', label: '全部数据', desc: `引用 ${matches.length} 场比赛` },
    { key: 'single', label: '单场', desc: '指定某场比赛' },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.modes}>
        {modes.map(m => (
          <button
            key={m.key}
            className={`${styles.modeBtn} ${selection.mode === m.key ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange(m.key)}
          >
            <span className={styles.modeLabel}>{m.label}</span>
            <span className={styles.modeDesc}>{m.desc}</span>
          </button>
        ))}
      </div>

      {selection.mode === 'single' && matches.length > 0 && (
        <div className={styles.matchPicker}>
          <div className={styles.pickerLabel}>选择要分析的比赛：</div>
          {matches.slice(0, 20).map(m => (
            <button
              key={m.id}
              className={`${styles.matchOption} ${selection.matchId === m.id ? styles.matchOptionActive : ''}`}
              onClick={() => handleMatchSelect(m.id)}
            >
              <span className={`${styles.moResult} ${m.result === 'win' ? styles.moWin : m.result === 'loss' ? styles.moLoss : styles.moDraw}`}>
                {m.result === 'win' ? 'W' : m.result === 'loss' ? 'L' : 'D'}
              </span>
              <span className={styles.moDate}>{new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
              <span className={styles.moMap}>{mapName(m.mapId)}</span>
              <span className={styles.moAgent}>{agentName(m.agentId)}</span>
              <span className={styles.moKda}>{m.kills}/{m.deaths}/{m.assists}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
