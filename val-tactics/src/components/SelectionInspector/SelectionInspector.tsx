import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './SelectionInspector.module.css'

const M = 7 / 1800

function fmt(n: number): string {
  const m = n / M
  return m >= 1 ? `${Math.round(m)}m` : `${Math.round(m * 100)}cm`
}

export default function SelectionInspector() {
  const { selectedId, selectedType, markers, drawings, textAnnotations, agentPositions, abilityShapes, dispatch } = useTactics()

  if (!selectedId || !selectedType) return null

  let content: { label: string; detail: string; color?: string; onDelete: () => void } | null = null

  if (selectedType === 'abilityShape') {
    const s = abilityShapes.find(x => x.id === selectedId)
    if (!s) return null
    const agent = agents.find(a => a.id === s.agentId)
    const ability = agent?.abilities.find(a => a.id === s.abilityId)
    const dims: string[] = []
    if (s.shape === 'circle') dims.push(`半径 ${fmt(s.radius)}`)
    if (s.shape === 'cone') dims.push(`角度 ${s.angle}°`, `射程 ${fmt(s.length)}`)
    if (s.shape === 'rect') dims.push(`${fmt(s.length)} × ${fmt(s.width)}`)
    if (s.shape === 'line') {
      if (s.path) dims.push(`路径 ${s.path.length - 1}段`)
      else dims.push(`长度 ${fmt(s.length)}`)
    }
    content = {
      label: `${agent?.name || '?'} · ${ability?.name || '?'}`,
      detail: `${ability?.key || ''} · ${s.shape} · ${dims.join(' · ')}`,
      onDelete: () => dispatch({ type: 'REMOVE_ABILITY_SHAPE', id: selectedId }),
    }
  } else if (selectedType === 'marker') {
    const m = markers.find(x => x.id === selectedId)
    if (!m) return null
    const agent = agents.find(a => a.id === m.agentId)
    const ability = agent?.abilities.find(a => a.id === m.abilityId)
    content = {
      label: `步骤 ${m.step} · ${agent?.name || '?'}`,
      detail: `${ability?.key || ''} · ${ability?.name || '?'}`,
      onDelete: () => dispatch({ type: 'REMOVE_MARKER', id: selectedId }),
    }
  } else if (selectedType === 'drawing') {
    const d = drawings.find(x => x.id === selectedId)
    if (!d) return null
    content = {
      label: `绘图 · ${d.type}`,
      detail: `颜色 ${d.color} · 宽 ${d.width}px`,
      color: d.color,
      onDelete: () => dispatch({ type: 'REMOVE_DRAWING', id: selectedId }),
    }
  } else if (selectedType === 'text') {
    const t = textAnnotations.find(x => x.id === selectedId)
    if (!t) return null
    content = {
      label: '文字标注',
      detail: `字号 ${t.fontSize}px · ${t.color}`,
      color: t.color,
      onDelete: () => dispatch({ type: 'REMOVE_TEXT', id: selectedId }),
    }
  } else if (selectedType === 'agent') {
    const a = agentPositions.find(x => x.id === selectedId)
    if (!a) return null
    const agent = agents.find(x => x.id === a.agentId)
    content = {
      label: `${agent?.name || '?'}`,
      detail: a.team === 'attack' ? '进攻方' : '防守方',
      onDelete: () => dispatch({ type: 'REMOVE_AGENT_POS', id: selectedId }),
    }
  }

  if (!content) return null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>{content.label}</span>
        <button className={styles.delBtn} onClick={content.onDelete} title="删除">✕</button>
      </div>
      <div className={styles.detail}>
        {content.color && <span className={styles.colorDot} style={{ background: content.color }} />}
        {content.detail}
      </div>
    </div>
  )
}
