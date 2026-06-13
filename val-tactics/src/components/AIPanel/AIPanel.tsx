import { useState } from 'react'
import AIChat from './AIChat'
import AISettings from './AISettings'
import MatchContextSelector from '../MatchHistory/MatchContextSelector'
import maps from '../../data/maps'
import agents from '../../data/agents'
import styles from './AIPanel.module.css'

function BoardInfoToggle() {
  const [on, setOn] = useState(() => {
    try { return localStorage.getItem('val-tactics-show-board-info') !== 'false' } catch { return true }
  })
  const toggle = () => {
    const next = !on
    setOn(next)
    localStorage.setItem('val-tactics-show-board-info', String(next))
  }
  return (
    <div onClick={toggle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
      background: on ? 'linear-gradient(135deg, rgba(5,248,248,.06), rgba(227,73,237,.03))' : 'rgba(255,255,255,.01)',
      border: on ? '1px solid rgba(5,248,248,.15)' : '1px solid rgba(255,255,255,.04)',
      transition: 'all .3s ease',
    }}>
      <div style={{ fontSize: 10, color: on ? '#05F8F8' : 'rgba(255,255,255,.35)', fontWeight: 500 }}>
        {on ? '● 读取棋盘' : '○ 仅用知识库'}
      </div>
      <div style={{
        width: 28, height: 16, borderRadius: 8,
        background: on ? 'linear-gradient(135deg, #05F8F8, #E349ED)' : 'rgba(255,255,255,.08)',
        position: 'relative', flexShrink: 0,
        transition: 'all .3s ease',
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2,
          left: on ? 14 : 2,
          transition: 'left .3s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>
    </div>
  )
}

/** 阵容选择器 — 地图 + 敌我阵容，持久化 localStorage */
function RosterPicker() {
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
          {/* 地图 */}
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
          {/* 我方阵容 */}
          <div>
            <div style={{ fontSize: 10, color: '#05F8F8', marginBottom: 4 }}>我方阵容 ({ally.length}/5)</div>
            {ally.map(id => chip(id, true, () => toggleAgent(ally, setAlly, 'val-tactics-ally-roster')(id)))}
            <div style={{ marginTop: 4 }}>
              {agents.filter(a => !ally.includes(a.id)).slice(0, 20).map(a => chip(a.id, false, () => toggleAgent(ally, setAlly, 'val-tactics-ally-roster')(a.id)))}
            </div>
          </div>
          {/* 敌方阵容 */}
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

interface Props {
  mapId: string
  mapName: string
  onClose: () => void
}

export default function AIPanel({ mapId, mapName, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* 折叠时的拉起按钮 */}
      {collapsed && (
        <div
          onClick={() => setCollapsed(false)}
          style={{
            position: 'fixed', top: '50%', right: 0, zIndex: 101,
            transform: 'translateY(-50%)',
            width: 28, height: 80, borderRadius: '14px 0 0 14px',
            background: 'linear-gradient(180deg, rgba(20,10,35,.96), rgba(10,6,20,.98))',
            border: '1px solid rgba(227,73,237,.16)', borderRight: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(10px)',
            boxShadow: '-2px 0 16px rgba(0,0,0,.2)',
            animation: 'panelSlideIn2 .3s ease',
          }}
        >
          <span style={{
            writingMode: 'vertical-rl', fontSize: 11, fontWeight: 600,
            background: 'linear-gradient(180deg, #05F8F8, #E349ED)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            T教练
          </span>
        </div>
      )}

      {/* 面板 */}
      <div
        className={styles.panel}
        style={{
          transform: collapsed ? 'translateX(100%)' : 'translateX(0)',
          transition: 'transform .35s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div className={styles.tabBar}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>💬 T教练</span>
          <button onClick={() => setCollapsed(true)} className={styles.tabClose} style={{ marginRight: 8 }}>◀</button>
          <button onClick={onClose} className={styles.tabClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BoardInfoToggle />
            <MatchContextSelector />
          </div>
          <RosterPicker />
          <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', flexShrink: 0 }}>
            <AISettings />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AIChat mapId={mapId} mapName={mapName} />
          </div>
        </div>
      </div>
    </>
  )
}
