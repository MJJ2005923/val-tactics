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
  return { agentName: agent?.name || '?', agentNameEn: agent?.nameEn || '', abilityName: ability?.name || '?', abilityKey: ability?.key || '?', color: ability ? typeColors[ability.type] || '#888' : '#888' }
}

export default function Timeline() {
  const { markers, abilityShapes, tracks, currentTrackId, recording, replaying, replayIndex, dispatch } = useTactics()
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // 当前活跃轨道
  // 录制计时器
  useEffect(() => {
    if (recording) {
      startTimeRef.current = Date.now()
      setElapsed(0)
      const iv = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 200)
      return () => clearInterval(iv)
    }
  }, [recording])
  const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  const trackId = activeTrackId || currentTrackId
  const trackMarkers = markers.filter(m => m.trackId === trackId)
  const sorted = [...trackMarkers].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))

  // 回放引擎（实时计时）
  useEffect(() => {
    if (!replaying) { if (timerRef.current) clearTimeout(timerRef.current); setElapsed(0); return }
    if (sorted.length === 0) { dispatch({ type: 'REPLAY_STOP' }); return }

    setElapsed(0)
    const elapsedTimer = window.setInterval(() => setElapsed(e => e + 1), 1000)
    const showMarker = (idx: number) => {
      if (idx >= sorted.length) {
        clearInterval(elapsedTimer)
        dispatch({ type: 'REPLAY_STOP' })
        return
      }
      const marker = sorted[idx]
      const shapeId = marker.shapeId
      if (shapeId) dispatch({ type: 'REPLAY_STEP', shapeId })
      if (marker.duration && marker.duration > 0 && shapeId) {
        window.setTimeout(() => dispatch({ type: 'HIDE_REPLAY_SHAPE', shapeId }), 1000 + marker.duration * 1000)
      }
    }

    // 所有延迟都在这里——包括第一个标记
    const schedule = (idx: number) => {
      if (idx >= sorted.length) { clearInterval(elapsedTimer); dispatch({ type: 'REPLAY_STOP' }); return }
      const marker = sorted[idx]
      const prevTime = idx > 0 ? (sorted[idx - 1].time || 0) : 0
      const gap = ((marker.time || 0) - prevTime) * 1000
      timerRef.current = window.setTimeout(() => {
        showMarker(idx)
        schedule(idx + 1)
      }, Math.max(gap, 100))
    }

    schedule(0)

    return () => { if (timerRef.current) clearTimeout(timerRef.current); clearInterval(elapsedTimer) }
  }, [replaying, sorted.length, dispatch])

  const totalItems = tracks.length + markers.length + abilityShapes.length

  if (totalItems === 0) {
    return (
      <div className={`${styles.wrapper} ${styles.empty}`}>
        <div className={styles.header}>
          <button className={`${styles.recBtn} ${recording ? styles.recordingActive : ''}`}
            onClick={() => dispatch({ type: recording ? 'RECORDING_STOP' : 'RECORDING_START' })}
            title={recording ? '停止录制' : '开始录制'}>
            {recording ? `⏹ ${timeStr}` : '⏺ 录制'}
          </button>
          <button className={styles.recBtn} title="回放">{replaying ? `⏹ ${timeStr}` : '▶'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button className={`${styles.recBtn} ${recording ? styles.recordingActive : ''}`}
          onClick={() => dispatch({ type: recording ? 'RECORDING_STOP' : 'RECORDING_START' })}
          title={recording ? '停止录制' : '开始录制'}>
          {recording ? `⏹ ${timeStr}` : '⏺ 录制'}
        </button>
        <button className={styles.recBtn}
          onClick={() => {
            if (trackId && sorted.length > 0) dispatch({ type: replaying ? 'REPLAY_STOP' : 'REPLAY_START', markers: sorted })
          }}
          title={replaying ? '停止回放' : '回放'}>
          {replaying ? `⏹ ${timeStr}` : '▶'}
        </button>
      </div>
      <div className={styles.trackList}>
        {tracks.map(t => {
          const tm = markers.filter(m => m.trackId === t.id)
          const isActive = t.id === trackId
          const isRecording = recording && t.id === currentTrackId
          const lastTime = tm.length > 0 ? tm[tm.length - 1].time : 0
          const timeStr = `${Math.floor(lastTime / 60)}:${String(lastTime % 60).padStart(2, '0')}`
          return (
              <div key={t.id}
                className={`${styles.trackItem} ${isActive ? styles.trackItemActive : ''} ${isRecording ? styles.trackItemRecording : ''}`}
                onClick={() => { if (!isActive) { setActiveTrackId(t.id); dispatch({ type: 'REPLAY_STOP' }) } }}>
                {renamingId === t.id ? (
                  <input className={styles.renameInput} value={renameText}
                    onChange={e => setRenameText(e.target.value)}
                    onBlur={() => { dispatch({ type: 'RENAME_TRACK', id: t.id, name: renameText || t.name }); setRenamingId(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') { dispatch({ type: 'RENAME_TRACK', id: t.id, name: renameText || t.name }); setRenamingId(null) } }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className={styles.trackName}
                    onDoubleClick={e => { e.stopPropagation(); setRenamingId(t.id); setRenameText(t.name) }}
                    title="双击重命名">{t.name}</span>
                )}
                <span className={styles.trackCount}>{tm.length} 步 · {timeStr}</span>
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
                    className={`${styles.stepItem} ${isPlaying ? styles.stepItemPlaying : ''} ${isPast ? styles.stepItemPast : ''}`}>
                    <span className={styles.stepNum}>{idx + 1}</span>
                    <span className={styles.stepText}>{info.agentName}/{info.agentNameEn} {info.abilityKey} · {info.abilityName}</span>
                    <div className={styles.durationWrap} onClick={e => e.stopPropagation()}>
                      <input className={styles.durationInput} type="number" min={0} max={99}
                        value={marker.duration ?? ''} placeholder="s"
                        onChange={e => {
                          const v = e.target.value ? Number(e.target.value) : undefined
                          dispatch({ type: 'UPDATE_MARKER', id: marker.id, updates: { duration: v } })
                        }} />
                      <span className={styles.durationLabel}>s</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
    </div>
  )
}
