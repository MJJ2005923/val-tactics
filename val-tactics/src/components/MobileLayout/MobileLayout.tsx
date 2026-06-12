import { useState, type ReactNode } from 'react'
import maps, { type MapData } from '../../data/maps'
import styles from './MobileLayout.module.css'

interface Props {
  mapCanvas: ReactNode
  agentPanel: ReactNode
  timeline: ReactNode
  communityPanel: ReactNode
  toolbar: ReactNode
  selectedMap: MapData
  onMapChange: (map: MapData) => void
  side: string
  onSideToggle: () => void
  notificationBell: ReactNode
  user: unknown
  onLogin: () => void
  onSave: () => void
  onTemplates: () => void
  onOpenRoom: () => void
  children?: ReactNode
}

const MAP_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const AGENT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)
const TIME_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
)
const COMM_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
)
const SAVE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
)
const FOLDER_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
)
const COLLAB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="9" cy="7" r="3"/><path d="M3 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/>
    <circle cx="17" cy="9" r="2.5"/><path d="M21 16c0-2-2-4-4-4"/>
    <line x1="13" y1="10" x2="15" y2="11"/><line x1="15" y1="13" x2="13" y2="14"/>
  </svg>
)

export default function MobileLayout({ mapCanvas, agentPanel, timeline, communityPanel, toolbar, selectedMap, onMapChange, side, onSideToggle, notificationBell, user, onLogin, onSave, onTemplates, onOpenRoom }: Props) {
  const [activeTab, setActiveTab] = useState<'map' | 'agents' | 'timeline' | 'community'>('map')
  const [showMapDropdown, setShowMapDropdown] = useState(false)

  return (
    <div className={styles.root}>
      {/* 全屏地图区 */}
      <div className={`${styles.mapArea} ${activeTab === 'map' ? styles.mapActive : styles.mapHidden}`}>
        {/* 顶部工具栏 */}
        <div className={styles.topToolbar}>
          <div style={{ position: 'relative' }}>
            <button className={styles.mapSelectBtn} onClick={() => setShowMapDropdown(v => !v)}>
              {selectedMap.name} <span style={{ fontSize: 8 }}>v</span>
            </button>
            {showMapDropdown && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMapDropdown(false)} />
                <div className={styles.mapDropdown}>
                  {maps.map(m => (
                    <button key={m.id} className={styles.mapDropdownItem} onClick={() => { onMapChange(m); setShowMapDropdown(false) }}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className={styles.sideBtn} onClick={onOpenRoom} title="多人协作" style={{ color: '#E349ED' }}>
              {COLLAB_ICON}
            </button>
            <button className={styles.sideBtn} onClick={onSideToggle}>
              {side === 'attack' ? '攻' : '守'}
            </button>
            {notificationBell}
            {user ? (
              <button className={styles.loginBtn} style={{ color: '#05F8F8' }}>
                {(user as any)?.email?.split('@')[0] || '我'}
              </button>
            ) : (
              <button className={styles.loginBtn} onClick={onLogin}>登录</button>
            )}
          </div>
        </div>

        {/* 地图 */}
        <div className={styles.mapInner}>
          {mapCanvas}
        </div>

        {/* 底部快捷操作栏 */}
        <div className={styles.quickBar}>
          <button className={styles.quickBtn} onClick={onTemplates}>
            {FOLDER_ICON} 模板
          </button>
          <button className={styles.quickBtn} onClick={onSave}>
            {SAVE_ICON} 保存
          </button>
          <div style={{ flex: 1 }} />
          {toolbar}
        </div>
      </div>

      {/* 英雄抽屉 */}
      <div className={`${styles.drawer} ${activeTab === 'agents' ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>英雄列表</span>
          <button className={styles.drawerClose} onClick={() => setActiveTab('map')}>收起</button>
        </div>
        <div className={styles.drawerBody}>{agentPanel}</div>
      </div>

      {/* 时间轴底部抽屉 */}
      <div className={`${styles.timelineDrawer} ${activeTab === 'timeline' ? styles.timelineOpen : ''}`}>
        <div className={styles.timelineDrawerHandle} onClick={() => setActiveTab('map')}>
          <div className={styles.handleBar} />
        </div>
        {timeline}
      </div>

      {/* 社区全屏 */}
      {activeTab === 'community' && (
        <div className={styles.communityOverlay}>
          {communityPanel}
        </div>
      )}

      {/* 底部 Tab 栏 */}
      <nav className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'map' ? styles.tabActive : ''}`} onClick={() => setActiveTab('map')}>
          <span className={styles.tabIcon}>{MAP_ICON}</span>
          <span className={styles.tabLabel}>地图</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'agents' ? styles.tabActive : ''}`} onClick={() => setActiveTab('agents')}>
          <span className={styles.tabIcon}>{AGENT_ICON}</span>
          <span className={styles.tabLabel}>英雄</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`} onClick={() => setActiveTab('timeline')}>
          <span className={styles.tabIcon}>{TIME_ICON}</span>
          <span className={styles.tabLabel}>时间轴</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'community' ? styles.tabActive : ''}`} onClick={() => setActiveTab('community')}>
          <span className={styles.tabIcon}>{COMM_ICON}</span>
          <span className={styles.tabLabel}>社区</span>
        </button>
      </nav>
    </div>
  )
}
