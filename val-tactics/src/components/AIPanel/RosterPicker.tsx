import { useState } from 'react'
import maps from '../../data/maps'
import agents from '../../data/agents'

/** 阵容选择器 — 地图 + 敌我阵容，持久化 localStorage。复用于 AIPanel 和 AIPage */
export default function RosterPicker() {
  const [expanded, setExpanded] = useState(false)
  const [preMap, setPreMap] = useState(() => localStorage.getItem('val-tactics-pre-map') || '')
  const [ally, setAlly] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('val-tactics-ally-roster') || '[]') } catch { return [] }
  })
  const [enemy, setEnemy] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('val-tactics-enemy-roster') || '[]') } catch { return [] }
  })

  const saveMap = (m: string) => { setPreMap(m); localStorage.setItem('val-tactics-pre-map', m) }
  const toggleAgent = (roster: string[], set: (v: string[]) => void, key: string) => (id: string) => {
    const next = roster.includes(id) ? roster.filter(a => a !== id) : roster.length < 5 ? [...roster, id] : roster
    set(next); localStorage.setItem(key, JSON.stringify(next))
  }

  const chip = (id: string, selected: boolean, onClick: () => void) => {
    const a = agents.find(x => x.id === id)
    return (
      <span key={id} onClick={onClick} title={a?.name} style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', margin: '1px',
        borderRadius: 8, cursor: 'pointer', fontSize: 10, userSelect: 'none',
        background: selected ? 'rgba(5,248,248,.15)' : 'rgba(255,255,255,.02)',
        border: `1px solid ${selected ? 'rgba(5,248,248,.35)' : 'rgba(255,255,255,.06)'}`,
        color: selected ? '#05F8F8' : 'rgba(255,255,255,.3)',
        transition: 'all .15s',
      }}>
        <img src={`/images/agents/${a?.id}.png`} alt="" style={{ width: 14, height: 14, borderRadius: '50%', opacity: selected ? 1 : .4 }} />
        {a?.name}
      </span>
    )
  }

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px', cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,.3)',
      }}>
        <span>⚔ 对局信息 · {ally.length + enemy.length > 0 ? `已选${ally.length + enemy.length}人` : '未设置'}</span>
        <span style={{ fontSize: 8 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginBottom: 4 }}>地图</div>
            <select value={preMap} onChange={e => saveMap(e.target.value)} style={{
              width: '100%', padding: '4px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.5)', fontSize: 11,
            }}>
              <option value="">（未选择）</option>
              {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#05F8F8', marginBottom: 4 }}>我方阵容 ({ally.length}/5)</div>
            {ally.map(id => chip(id, true, () => toggleAgent(ally, setAlly, 'val-tactics-ally-roster')(id)))}
            <div style={{ marginTop: 4 }}>
              {agents.filter(a => !ally.includes(a.id)).slice(0, 20).map(a => chip(a.id, false, () => toggleAgent(ally, setAlly, 'val-tactics-ally-roster')(a.id)))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#ff4655', marginBottom: 4 }}>敌方阵容 ({enemy.length}/5)</div>
            {enemy.map(id => chip(id, true, () => toggleAgent(enemy, setEnemy, 'val-tactics-enemy-roster')(id)))}
            <div style={{ marginTop: 4 }}>
              {agents.filter(a => !enemy.includes(a.id)).slice(0, 20).map(a => chip(a.id, false, () => toggleAgent(enemy, setEnemy, 'val-tactics-enemy-roster')(a.id)))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
