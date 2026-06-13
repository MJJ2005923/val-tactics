import { useState, useCallback } from 'react'
import { useAuth } from '../../store/AuthContext'
import CommunityTopBar from './CommunityTopBar'
import CommunitySidebar from './CommunitySidebar'
import CommunityHome from './CommunityHome'
import TacticsGallery from './TacticsGallery'
import TacticsDetail from './TacticsDetail'
import ForumPage from './ForumPage'
import PostDetail from './PostDetail'
import CreatePost from './CreatePost'
import LineupsPage from './LineupsPage'
import LineupsDetail from './LineupsDetail'
import LineupsCreate from './LineupsCreate'
import ProfilePage from './ProfilePage'
import CollectionPage from './CollectionPage'
import CreateShare from './CreateShare'
import type { CommunityNav } from './CommunitySidebar'
import styles from './CommunityShell.module.css'

interface Props {
  selectedMap: string
  onClose: () => void
  onLoadTactic?: (data: Record<string, unknown>, mapId: string) => void
}

export default function CommunityShell({ selectedMap, onClose, onLoadTactic }: Props) {
  const { user } = useAuth()
  const myId = user?.id || ''
  const [nav, setNav] = useState<CommunityNav>('home')
  const [detailId, setDetailId] = useState('')
  const [detailType, setDetailType] = useState<'tactic' | 'post' | 'lineup'>('tactic')
  const [search, setSearch] = useState('')
  const [profileUserId, setProfileUserId] = useState('')
  const [showCreate, setShowCreate] = useState<'tactic' | 'post' | 'lineup' | null>(null)

  const navLabels: Record<CommunityNav, string> = {
    home: '社区首页', tactics: '战术广场', forum: '论坛大厅',
    lineups: '技能点位', profile: '个人主页', favorites: '我的收藏', liked: '我的赞过',
  }

  const openDetail = useCallback((id: string, type: 'tactic' | 'post' | 'lineup') => {
    setDetailId(id)
    setDetailType(type)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailId('')
  }, [])

  const viewProfile = useCallback((uid: string) => {
    setProfileUserId(uid)
    setNav('profile')
  }, [])

  const renderContent = () => {
    // 详情页（嵌入显示）
    if (detailId) {
      if (detailType === 'tactic') return (
        <TacticsDetail tacticId={detailId} onBack={closeDetail} onLoadToBoard={onLoadTactic || (() => {})} />
      )
      if (detailType === 'post') return (
        <PostDetail postId={detailId} onBack={closeDetail} />
      )
      if (detailType === 'lineup') return (
        <LineupsDetail lineupId={detailId} onBack={closeDetail} />
      )
    }

    // 首页
    if (nav === 'home') return (
      <CommunityHome
        search={search}
        onViewTactic={(id) => openDetail(id, 'tactic')}
        onViewPost={(id) => openDetail(id, 'post')}
        onViewLineup={(id) => openDetail(id, 'lineup')}
        onViewProfile={viewProfile}
        onCreateTactic={() => setShowCreate('tactic')}
        onCreatePost={() => setShowCreate('post')}
      />
    )

    // 各子页面
    if (nav === 'tactics') return (
      <TacticsGallery
        embedded
        onBack={() => setNav('home')}
        onViewTactic={(id) => openDetail(id, 'tactic')}
        onCreate={() => setShowCreate('tactic')}
        onViewProfile={viewProfile}
        onViewForum={() => setNav('forum')}
        onViewLineups={() => setNav('lineups')}
      />
    )

    if (nav === 'forum') return (
      <ForumPage
        embedded
        onBack={() => setNav('home')}
        onViewPost={(id) => openDetail(id, 'post')}
        onCreatePost={() => setShowCreate('post')}
      />
    )

    if (nav === 'lineups') return (
      <LineupsPage
        embedded
        onBack={() => setNav('home')}
        onViewLineup={(id) => openDetail(id, 'lineup')}
        onCreateLineup={() => setShowCreate('lineup')}
      />
    )

    const shownUserId = profileUserId || myId

    if (nav === 'profile') return (
      <ProfilePage
        embedded
        userId={shownUserId}
        onBack={() => setNav('home')}
        onViewTactic={(id) => openDetail(id, 'tactic')}
        onViewPost={(id) => openDetail(id, 'post')}
        onViewLineup={(id) => openDetail(id, 'lineup')}
      />
    )

    if (nav === 'favorites') return (
      <CollectionPage type="favorites" onViewTactic={(id) => openDetail(id, 'tactic')} onViewPost={(id) => openDetail(id, 'post')} onViewLineup={(id) => openDetail(id, 'lineup')} />
    )

    if (nav === 'liked') return (
      <CollectionPage type="liked" onViewTactic={(id) => openDetail(id, 'tactic')} onViewPost={(id) => openDetail(id, 'post')} onViewLineup={(id) => openDetail(id, 'lineup')} />
    )

    return null
  }

  return (
    <div className={styles.shell}>
      <CommunityTopBar
        title={`社区 · ${navLabels[nav]}`}
        onClose={onClose}
        search={search}
        onSearch={setSearch}
      />
      <div className={styles.main}>
        <CommunitySidebar active={nav} onNav={setNav} />
        <div className={styles.content}>
          {renderContent()}
        </div>
      </div>

      {/* 创作弹窗 */}
      {showCreate === 'tactic' && (
        <CreateShare mapId={selectedMap} onClose={() => setShowCreate(null)}
          onSuccess={(id) => { setShowCreate(null); openDetail(id, 'tactic') }} />
      )}
      {showCreate === 'post' && (
        <CreatePost onClose={() => setShowCreate(null)}
          onSuccess={(id) => { setShowCreate(null); openDetail(id, 'post') }} />
      )}
      {showCreate === 'lineup' && (
        <LineupsCreate mapId={selectedMap} onClose={() => setShowCreate(null)}
          onSuccess={(id) => { setShowCreate(null); openDetail(id, 'lineup') }} />
      )}
    </div>
  )
}
