import { useState } from 'react'
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
  return {
    agentName: agent?.name || '?',
    abilityName: ability?.name || '?',
    abilityKey: ability?.key || '?',
    color: ability ? typeColors[ability.type] || '#888' : '#888'
  }
}

export default function Timeline() {
  const { markers, updateMarker, removeMarker, selectMarker, selectedId } = useTactics()
  const [collapsed, setCollapsed] = useState(false)

  const sorted = [...markers].sort((a, b) => a.step - b.step)

  const moveStep = (id: string, direction: -1 | 1) => {
    const idx = sorted.findIndex(m => m.id === id)
    if (idx === -1) return
    const target = sorted[idx + direction]
    if (!target) return

    const current = markers.find(m => m.id === id)!
    const swap = markers.find(m => m.id === target.id)!
    updateMarker(id, { step: swap.step, time: swap.time })
    updateMarker(target.id, { step: current.step, time: current.time })
  }

  const adjustTime = (id: string, delta: number) => {
    const marker = markers.find(m => m.id === id)
    if (!marker) return
    updateMarker(id, { time: Math.max(0, marker.time + delta) })
  }

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
        <span className={styles.count}>{markers.length} 个步骤</span>
        <span className={styles.collapseIcon}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className={styles.track}>
          {sorted.map((marker, idx) => {
            const info = getInfo(marker.abilityId, marker.agentId)
            const isSelected = marker.id === selectedId
            return (
              <div
                key={marker.id}
                className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
                style={{ borderLeftColor: info.color }}
                onClick={() => selectMarker(marker.id)}
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
                  <div className={styles.timeControl}>
                    <button className={styles.timeBtn} onClick={(e) => { e.stopPropagation(); adjustTime(marker.id, -1) }}>−</button>
                    <span className={styles.timeValue}>{marker.time}s</span>
                    <button className={styles.timeBtn} onClick={(e) => { e.stopPropagation(); adjustTime(marker.id, 1) }}>+</button>
                  </div>
                  <div className={styles.orderBtns}>
                    <button className={styles.orderBtn} disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveStep(marker.id, -1) }}>←</button>
                    <button className={styles.orderBtn} disabled={idx === sorted.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveStep(marker.id, 1) }}>→</button>
                  </div>
                  <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); removeMarker(marker.id) }}
                    title="删除">✕</button>
                </div>
              </div>
            )
          })}
          {/* 横向滚动提示 */}
          <div className={styles.scrollHint}>← 拖拽滚动查看更多 →</div>
        </div>
      )}
    </div>
  )
}
