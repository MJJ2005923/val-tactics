import styles from './CommunitySidebar.module.css'

export type CommunityNav = 'home' | 'tactics' | 'forum' | 'lineups' | 'profile' | 'favorites' | 'liked'

interface Props {
  active: CommunityNav
  onNav: (nav: CommunityNav) => void
  favCount?: number
  likeCount?: number
}

const items: { id: CommunityNav; icon: string; label: string; section?: string }[] = [
  { id: 'home', icon: '🏠', label: '社区首页' },
  { id: 'tactics', icon: '📋', label: '战术广场' },
  { id: 'forum', icon: '💬', label: '论坛大厅' },
  { id: 'lineups', icon: '🎯', label: '技能点位' },
  { id: 'profile', icon: '👤', label: '个人主页' },
]

const myItems: { id: CommunityNav; icon: string; label: string }[] = [
  { id: 'favorites', icon: '⭐', label: '我的收藏' },
  { id: 'liked', icon: '❤️', label: '我的赞过' },
]

export default function CommunitySidebar({ active, onNav, favCount, likeCount }: Props) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.section}>探索</div>
      {items.map(item => (
        <div key={item.id}
          className={`${styles.navItem} ${active === item.id ? styles.active : ''}`}
          onClick={() => onNav(item.id)}>
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </div>
      ))}
      <div className={styles.divider} />
      <div className={styles.section}>我的</div>
      {myItems.map(item => (
        <div key={item.id}
          className={`${styles.navItem} ${active === item.id ? styles.active : ''}`}
          onClick={() => onNav(item.id)}>
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
          {item.id === 'favorites' && (favCount || 0) > 0 && <span className={styles.badge}>{favCount}</span>}
          {item.id === 'liked' && (likeCount || 0) > 0 && <span className={styles.badge}>{likeCount}</span>}
        </div>
      ))}
    </div>
  )
}
