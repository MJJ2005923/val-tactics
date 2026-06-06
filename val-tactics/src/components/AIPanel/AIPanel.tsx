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
      {tab === 'chat' && <AIChat mapId={mapId} mapName={mapName} />}
    </div>
  )
}
