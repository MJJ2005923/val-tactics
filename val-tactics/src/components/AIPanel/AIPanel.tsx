import { useState } from 'react'
import AIChat from './AIChat'
import MatchContextSelector from '../MatchHistory/MatchContextSelector'
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
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <AIChat mapId={mapId} mapName={mapName} />
          </div>
        </div>
      </div>
    </>
  )
}
