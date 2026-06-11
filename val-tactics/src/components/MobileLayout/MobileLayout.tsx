import { useState, type ReactNode } from 'react'
import styles from './MobileLayout.module.css'

interface Props {
  mapCanvas: ReactNode
  agentPanel: ReactNode
  timeline: ReactNode
  communityPanel: ReactNode
  toolbar: ReactNode
  children?: ReactNode
}

export default function MobileLayout({ mapCanvas, agentPanel, timeline, communityPanel, toolbar }: Props) {
  const [activeTab, setActiveTab] = useState<'map' | 'agents' | 'timeline' | 'community'>('map')

  return (
    <div className={styles.root}>
      {/* 全屏地图区 */}
      <div className={`${styles.mapArea} ${activeTab === 'map' ? styles.mapActive : styles.mapHidden}`}>
        {toolbar}
        {mapCanvas}
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
          <span className={styles.tabIcon}>m</span>
          <span className={styles.tabLabel}>地图</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'agents' ? styles.tabActive : ''}`} onClick={() => setActiveTab('agents')}>
          <span className={styles.tabIcon}>a</span>
          <span className={styles.tabLabel}>英雄</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'timeline' ? styles.tabActive : ''}`} onClick={() => setActiveTab('timeline')}>
          <span className={styles.tabIcon}>t</span>
          <span className={styles.tabLabel}>时间轴</span>
        </button>
        <button className={`${styles.tab} ${activeTab === 'community' ? styles.tabActive : ''}`} onClick={() => setActiveTab('community')}>
          <span className={styles.tabIcon}>c</span>
          <span className={styles.tabLabel}>社区</span>
        </button>
      </nav>
    </div>
  )
}
