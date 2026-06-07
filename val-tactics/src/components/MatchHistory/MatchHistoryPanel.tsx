import { useState, useCallback } from 'react'
import MatchForm from './MatchForm'
import MatchImport from './MatchImport'
import MatchList from './MatchList'
import MatchStats from './MatchStats'
import styles from './MatchHistoryPanel.module.css'

interface Props {
  compact?: boolean
}

export default function MatchHistoryPanel({ compact }: Props) {
  const [tab, setTab] = useState<'form' | 'import' | 'list' | 'stats'>('form')
  // 数据变更计数器：子组件保存/导入后递增，触发 List/Stats 刷新
  const [tick, setTick] = useState(0)

  // 数据变更后切到记录页
  const handleSaved = useCallback(() => {
    setTick(t => t + 1)
    setTab('list')
  }, [])

  const tabs = [
    { key: 'form' as const, label: '录入' },
    { key: 'import' as const, label: '批量' },
    { key: 'list' as const, label: '记录' },
    { key: 'stats' as const, label: '统计' },
  ]

  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* 所有Tab保持挂载，避免切换丢表单数据 */}
        <div style={{ display: tab === 'form' ? 'block' : 'none' }}>
          <MatchForm onSaved={handleSaved} compact={compact} />
        </div>
        <div style={{ display: tab === 'import' ? 'block' : 'none' }}>
          <MatchImport onImported={handleSaved} compact={compact} />
        </div>
        <div style={{ display: tab === 'list' ? 'block' : 'none' }}>
          <MatchList key={`list-${tick}`} compact={compact} />
        </div>
        <div style={{ display: tab === 'stats' ? 'block' : 'none' }}>
          <MatchStats key={`stats-${tick}`} compact={compact} />
        </div>
      </div>
    </div>
  )
}
