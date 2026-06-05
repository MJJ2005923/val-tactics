import { useState } from 'react'
import AISettings from './AISettings'
import AIChat from './AIChat'
import styles from './AIPanel.module.css'

interface Props {
  mapId: string
  mapName: string
  onClose: () => void
}

export default function AIPanel({ mapId, mapName, onClose }: Props) {
  const [tab, setTab] = useState<'chat' | 'settings'>('chat')

  return (
    <div className={styles.panel}>
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e', flexShrink: 0 }}>
        <button
          onClick={() => setTab('chat')}
          style={{
            flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
            background: tab === 'chat' ? '#1a1a24' : 'transparent',
            color: tab === 'chat' ? '#fff' : '#666', fontSize: 13, fontWeight: 600,
          }}>
          💬 AI 对话
        </button>
        <button
          onClick={() => setTab('settings')}
          style={{
            flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
            background: tab === 'settings' ? '#1a1a24' : 'transparent',
            color: tab === 'settings' ? '#fff' : '#666', fontSize: 13, fontWeight: 600,
          }}>
          ⚙️ 设置
        </button>
        <button
          onClick={onClose}
          style={{
            width: 36, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#666', fontSize: 16,
          }}>
          ✕
        </button>
      </div>

      {tab === 'settings' && <AISettings />}
      {tab === 'chat' && <AIChat mapId={mapId} mapName={mapName} />}
    </div>
  )
}
