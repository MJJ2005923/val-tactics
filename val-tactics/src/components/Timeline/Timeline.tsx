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
  const { markers, abilityShapes, selectedId, selectedType, recording, replaying, replayIndex, dispatch } = useTactics()
  const [collapsed, setCollapsed] = useState(false)
  const timerRef = useRef<number | null>(null)

  // 按 mark 创建时间排序（录制模式）或 step 排序
  const sorted = [...markers].sort((a, b) => {
    if (a.createdAt && b.createdAt) return a.createdAt - b.createdAt
    return a.step - b.step
  })

  // 回放引擎
  useEffect(() => {
    if (!replaying) { if (timerRef.current) clearInterval(timerRef.current); return }
    if (sorted.length === 0) { dispatch({ type: 'REPLAY_STOP' }); return }

    timerRef.current = window.setInterval(() => {
      dispatch({ type: 'REPLAY_STEP', index: replayIndex + 1 })
    }, 1500)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [replaying, replayIndex, sorted.length, dispatch])

  // 回放结束
  useEffect(() => {
    if (replaying && replayIndex >= sorted.length) {
      dispatch({ type: 'REPLAY_STOP' })
    }
  }, [replayIndex, sorted.length, replaying, dispatch])

  const totalItems = markers.length + abilityShapes.length

  // 空状态
  if (totalItems === 0) {
    return (
      <div className={`${styles.wrapper} ${styles.empty}`}>
        <div className={styles.header}>
          <span>时间轴</span>
          <span className={styles.tip}>拖拽技能到地图上以添加步骤 · 点击录制按钮开始实时记录</span>
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
        <span className={styles.count}>{markers.length} 步骤</span>
        <div className={styles.recControls} onClick={e => e.stopPropagation()}>
          <button className={`${styles.recBtn} ${recording ? styles.recordingActive : ''}`}
            onClick={() => dispatch({ type: recording ? 'RECORDING_STOP' : 'RECORDING_START' })}
            title={recording ? '停止录制' : '开始录制'}>
            {recording ? '⏹' : '⏺'}
          </button>
          <button className={styles.playBtn}
            onClick={() => dispatch({ type: replaying ? 'REPLAY_STOP' : 'REPLAY_START', markers: sorted })}
            title={replaying ? '停止回放' : '回放'}>
            {replaying ? '⏹' : '▶'}
          </button>
        </div>
        <span className={styles.collapseIcon}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className={styles.track}>
          {sorted.map((marker, idx) => {
            const info = getInfo(marker.abilityId, marker.agentId)
            const isSelected = marker.id === selectedId && selectedType === 'marker'
            const isPlaying = replaying && idx === replayIndex
            // 回放时已过的步骤
            const isPast = replaying && idx <= replayIndex
            return (
              <div key={marker.id}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ''} ${isPlaying ? styles.itemPlaying : ''} ${isPast ? styles.itemPast : ''}`}
                style={{ borderLeftColor: info.color, minWidth: 160 }}
              >
                <div className={styles.stepBadge}>{idx + 1}</div>
                <div className={styles.itemInfo}>
                  <div className={styles.agentLabel}>{info.agentName}</div>
                  <div className={styles.abilityLabel}>
                    <span className={styles.keyTag}>{info.abilityKey}</span>
                    {info.abilityName}
                  </div>
                </div>
                <div className={styles.itemTime}>{marker.time}s</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
