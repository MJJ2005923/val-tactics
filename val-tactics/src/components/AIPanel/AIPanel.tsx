import { useState } from 'react'
import AISettings from './AISettings'
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
    <div
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
        background: on
          ? 'linear-gradient(135deg, rgba(5,248,248,.08), rgba(227,73,237,.04))'
          : 'rgba(255,255,255,.02)',
        border: on ? '1px solid rgba(5,248,248,.2)' : '1px solid rgba(255,255,255,.06)',
        transition: 'all .3s cubic-bezier(.16,1,.3,1)',
        boxShadow: on ? '0 0 16px rgba(5,248,248,.06)' : 'none',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: on ? '#05F8F8' : 'rgba(255,255,255,.45)', fontWeight: 500, transition: 'color .3s' }}>
          {on ? '● 读取棋盘' : '○ 仅用知识库'}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.2)', marginTop: 1 }}>
          特工 · 技能 · 标注
        </div>
      </div>
      <div style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? 'linear-gradient(135deg, #05F8F8, #E349ED)' : 'rgba(255,255,255,.1)',
        transition: 'all .3s cubic-bezier(.16,1,.3,1)',
        position: 'relative', flexShrink: 0,
        boxShadow: on ? '0 0 10px rgba(5,248,248,.25)' : 'none',
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          position: 'absolute', top: 2,
          left: on ? 18 : 2,
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
  const [tab, setTab] = useState<'chat' | 'settings'>('chat')

  return (
    <div className={styles.panel}>
      <div className={styles.tabBar}>
        <button
          onClick={() => setTab('chat')}
          className={`${styles.tabBtn} ${tab === 'chat' ? styles.tabBtnActive : ''}`}>
          💬 AI 对话
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`${styles.tabBtn} ${tab === 'settings' ? styles.tabBtnActive : ''}`}>
          ⚙️ 设置
        </button>
        <button onClick={onClose} className={styles.tabClose}>✕</button>
      </div>

      {tab === 'settings' && <AISettings />}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(227,73,237,.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
              🗺️ 基础信息
            </div>
            <BoardInfoToggle />
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(227,73,237,.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, marginTop: 10 }}>
              📊 数据引用
            </div>
            <MatchContextSelector />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat mapId={mapId} mapName={mapName} />
          </div>
        </div>
      )}
    </div>
  )
}
