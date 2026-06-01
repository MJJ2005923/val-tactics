import React, { useState, useRef, useEffect } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './Timeline.module.css'

const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

const phases = ['', '购买阶段', '站位', '默认', '执行', '残局']
const phaseColors: Record<string, string> = {
  '购买阶段': '#f0c850', '站位': '#50b4f0', '默认': '#50e890', '执行': '#ff4655', '残局': '#a070d8'
}

function getInfo(abilityId: string, agentId: string) {
  const agent = agents.find(a => a.id === agentId)
  const ability = agent?.abilities.find(a => a.id === abilityId)
  return { agentName: agent?.name || '?', abilityName: ability?.name || '?', abilityKey: ability?.key || '?', color: ability ? typeColors[ability.type] || '#888' : '#888' }
}

export default function Timeline() {
  const { markers, selectedId, selectedType, playing, playSpeed, playStep, dispatch } = useTactics()
  const [collapsed, setCollapsed] = useState(false)
  const timerRef = useRef<number | null>(null)

  const sorted = [...markers].sort((a, b) => a.step - b.step)

  const moveStep = (id: string, direction: -1 | 1) => {
    const idx = sorted.findIndex(m => m.id === id)
    if (idx === -1) return
    const target = sorted[idx + direction]
    if (!target) return
    const current = markers.find(m => m.id === id)!
    const swap = markers.find(m => m.id === target.id)!
    dispatch({ type: 'UPDATE_MARKER', id, updates: { step: swap.step, time: swap.time } })
    dispatch({ type: 'UPDATE_MARKER', id: target.id, updates: { step: current.step, time: current.time } })
  }

  const adjustTime = (id: string, delta: number) => {
    const marker = markers.find(m => m.id === id)
    if (!marker) return
    dispatch({ type: 'UPDATE_MARKER', id, updates: { time: Math.max(0, marker.time + delta) } })
  }

  // 播放逻辑
  useEffect(() => {
    if (!playing) { if (timerRef.current) clearInterval(timerRef.current); return }
    const sorted2 = [...markers].sort((a, b) => a.step - b.step)
    const totalSteps = sorted2.length
    if (totalSteps === 0) { dispatch({ type: 'PLAY_STOP' }); return }

    timerRef.current = window.setInterval(() => {
      dispatch({ type: 'PLAY_STEP', step: (playStep + 1) })
    }, 1000 / playSpeed)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, playSpeed, playStep, markers, dispatch])

  // 播放完自动停止
  useEffect(() => {
    if (playing && playStep >= sorted.length) {
      dispatch({ type: 'PLAY_STOP' })
    }
  }, [playStep, sorted.length, playing, dispatch])

  const totalDuration = sorted.reduce((sum, m) => Math.max(sum, m.time), 0)

  // 空状态
  if (markers.length === 0) {
    return (
      <div className={`${styles.wrapper} ${styles.empty}`}>
        <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
          <span>时间轴</span>
          <span className={styles.tip}>拖拽技能到地图上以添加步骤</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span>时间轴</span>
        <span className={styles.count}>{markers.length} 个步骤 · {totalDuration}s</span>
        <div className={styles.playbackControls} onClick={e => e.stopPropagation()}>
          <button className={styles.playBtn} onClick={() => dispatch({ type: playing ? 'PLAY_STOP' : 'PLAY_START' })}>
            {playing ? '⏸' : '▶'}
          </button>
          {playing && (
            <select className={styles.speedSelect} value={playSpeed} onChange={e => dispatch({ type: 'PLAY_SPEED', speed: Number(e.target.value) })}>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          )}
        </div>
        <span className={styles.collapseIcon}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className={styles.track}>
          {/* 时间标尺 */}
          <div className={styles.ruler}>
            {Array.from({ length: Math.max(totalDuration, 1) + 1 }, (_, i) => (
              <span key={i} className={styles.rulerTick}>{i}s</span>
            ))}
          </div>
          {sorted.map((marker, idx) => {
            const info = getInfo(marker.abilityId, marker.agentId)
            const isSelected = marker.id === selectedId && selectedType === 'marker'
            const isPlaying = playing && playStep === idx
            const phase = marker.phase || ''
            const prevPhase = idx > 0 ? (sorted[idx - 1].phase || '') : ''
            const showPhase = phase !== prevPhase
            return (
              <React.Fragment key={marker.id}>
                {/* 阶段分隔线 */}
                {showPhase && (
                  <div className={styles.phaseSep} style={phase ? { borderColor: phaseColors[phase] || '#888' } : undefined}>
                    <span className={styles.phaseLabel} style={phase ? { color: phaseColors[phase] || '#888' } : { color: '#555' }}>
                      {phase || '未分组'}
                    </span>
                    <div className={styles.phaseLine} style={phase ? { background: phaseColors[phase] + '40' } : undefined} />
                  </div>
                )}
                <div
                  className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${isPlaying ? styles.itemPlaying : ''}`}
                  style={{ borderLeftColor: info.color }}
                  onClick={() => dispatch({ type: 'SELECT', id: marker.id, selType: 'marker' })}
                >
                  <div className={styles.stepBadge}>{marker.step}</div>
                  <div className={styles.itemInfo}>
                    <div className={styles.agentLabel}>{info.agentName}</div>
                    <div className={styles.abilityLabel}>
                      <span className={styles.keyTag}>{info.abilityKey}</span>
                      {info.abilityName}
                    </div>
                  </div>
                  <div className={styles.itemActions}>
                    <select className={styles.phaseSelect} value={phase}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const v = e.target.value
                        dispatch({ type: 'UPDATE_MARKER', id: marker.id, updates: { phase: v || undefined } })
                      }}>
                      {phases.map(p => <option key={p} value={p}>{p || '—'}</option>)}
                    </select>
                    <div className={styles.timeControl}>
                      <button className={styles.timeBtn} onClick={e => { e.stopPropagation(); adjustTime(marker.id, -1) }}>−</button>
                      <span className={styles.timeValue}>{marker.time}s</span>
                      <button className={styles.timeBtn} onClick={e => { e.stopPropagation(); adjustTime(marker.id, 1) }}>+</button>
                    </div>
                    <div className={styles.orderBtns}>
                      <button className={styles.orderBtn} disabled={idx === 0}
                        onClick={e => { e.stopPropagation(); moveStep(marker.id, -1) }}>←</button>
                      <button className={styles.orderBtn} disabled={idx === sorted.length - 1}
                        onClick={e => { e.stopPropagation(); moveStep(marker.id, 1) }}>→</button>
                    </div>
                    <button className={styles.removeBtn}
                      onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_MARKER', id: marker.id }) }}>✕</button>
                  </div>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
