import type { CommunityNav } from './CommunitySidebar'
import styles from './CommunityBottomBar.module.css'

interface Props {
  active: CommunityNav
  onNav: (nav: CommunityNav) => void
}

const tabs: { id: CommunityNav; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '首页' },
  { id: 'tactics', icon: '📋', label: '战术' },
  { id: 'forum', icon: '💬', label: '论坛' },
  { id: 'lineups', icon: '🎯', label: '点位' },
  { id: 'profile', icon: '👤', label: '我的' },
]

export default function CommunityBottomBar({ active, onNav }: Props) {
  return (
    <div className={styles.bar}>
      {tabs.map(tab => (
        <div key={tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={() => onNav(tab.id)}>
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
          {active === tab.id && <div className={styles.indicator} />}
        </div>
      ))}
    </div>
  )
}
