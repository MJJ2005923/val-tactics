import { useState, useRef, useEffect } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './Timeline.module.css'

const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

function getInfo(abilityId: string, agentId: string) {
  const agent = agents.find(a => a.id === agentId)
  const ability = agent?.abilities.find(a => a.id === abilityId)
  return { agentName: agent?.name || '?', abilityName: ability?.name || '?', abilityKey: ability?.key || '?', color: ability ? typeColors[ability.type] || '#888' : '#888' }
}

export default function Timeline() {
  const { markers, abilityShapes, tracks, currentTrackId, recording, replaying, replayIndex, dispatch } = useTactics()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  // 当前活跃轨道
  const trackId = activeTrackId || currentTrackId
  const trackMarkers = markers.filter(m => m.trackId === trackId)
  const sorted = [...trackMarkers].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

  // 回放引擎
  useEffect(() => {
    if (!replaying) { if (timerRef.current) clearTimeout(timerRef.current); return }
    if (sorted.length === 0) { dispatch({ type: 'REPLAY_STOP' }); return }

    const playNext = (idx: number) => {
      if (idx >= sorted.length) {
        dispatch({ type: 'REPLAY_STOP' })
        return
      }
      dispatch({ type: 'REPLAY_STEP', index: idx })
      timerRef.current = window.setTimeout(() => playNext(idx + 1), 1500)
    }

    playNext(0)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [replaying, sorted.length, dispatch])

  const totalItems = tracks.length + markers.length + abilityShapes.length

  if (totalItems === 0) {
    return (
      <div className={`${styles.wrapper} ${styles.empty}`}>
        <div className={styles.header}>
          <span>时间轴</span>
          <span className={styles.tip}>拖拽技能到地图上 · 点击录制按钮开始</span>
          <div className={styles.recControls} onClick={e => e.stopPropagation()}>
            <button className={`${styles.recBtn} ${recording ? styles.recordingActive : ''}`}
              onClick={() => dispatch({ type: recording ? 'RECORDING_STOP' : 'RECORDING_START' })}
              title={recording ? '停止录制' : '开始录制'}>
              {recording ? '⏹' : '⏺'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span>时间轴</span>
        <span className={styles.count}>{tracks.length} 个录制 · {markers.length} 步骤</span>
        <div className={styles.recControls} onClick={e => e.stopPropagation()}>
          <button className={`${styles.recBtn} ${recording ? styles.recordingActive : ''}`}
            onClick={() => dispatch({ type: recording ? 'RECORDING_STOP' : 'RECORDING_START' })}
            title={recording ? '停止录制' : '开始录制'}>
            {recording ? '⏹' : '⏺'}
          </button>
        </div>
        <span className={styles.collapseIcon}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className={styles.trackList}>
          {tracks.map(t => {
            const tm = markers.filter(m => m.trackId === t.id)
            const isActive = t.id === trackId
            const isRecording = recording && t.id === currentTrackId
            return (
              <div key={t.id}
                className={`${styles.trackItem} ${isActive ? styles.trackItemActive : ''} ${isRecording ? styles.trackItemRecording : ''}`}
                onClick={() => { if (!isActive) { setActiveTrackId(t.id); dispatch({ type: 'REPLAY_STOP' }) } }}>
                <span className={styles.trackName}>{t.name}</span>
                <span className={styles.trackCount}>{tm.length} 步骤</span>
                <button className={`${styles.trackPlayBtn} ${isActive && replaying ? styles.trackPlayBtnActive : ''}`}
                  onClick={e => {
                    e.stopPropagation()
                    if (isActive) {
                      dispatch({ type: replaying ? 'REPLAY_STOP' : 'REPLAY_START', markers: sorted })
                    } else {
                      setActiveTrackId(t.id)
                    }
                  }}
                  title={isActive && replaying ? '停止' : '回放'}>
                  {isActive && replaying ? '⏹' : '▶'}
                </button>
                <button className={styles.trackDelBtn}
                  onClick={e => {
                    e.stopPropagation()
                    dispatch({ type: 'DELETE_TRACK', id: t.id })
                    if (isActive) setActiveTrackId(null)
                  }}>✕</button>
              </div>
            )
          })}
          {/* 活动轨道的步骤列表 */}
          {trackId && sorted.length > 0 && (
            <div className={styles.trackSteps}>
              {sorted.map((marker, idx) => {
                const info = getInfo(marker.abilityId, marker.agentId)
                const isPlaying = replaying && idx === replayIndex
                const isPast = replaying && idx <= replayIndex
                return (
                  <div key={marker.id}
                    className={`${styles.stepItem} ${isPlaying ? styles.stepItemPlaying : ''} ${isPast ? styles.stepItemPast : ''}`}
                    style={{ borderLeftColor: info.color }}>
                    <span className={styles.stepNum}>{idx + 1}</span>
                    <span className={styles.stepAgent}>{info.agentName}</span>
                    <span className={styles.stepAbility}>
                      <span className={styles.keyTag}>{info.abilityKey}</span>
                      {info.abilityName}
                    </span>
                    <span className={styles.stepTime}>{marker.time}s</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
