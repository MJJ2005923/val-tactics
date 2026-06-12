import { useState, useRef, useEffect } from 'react'
import './App.css'
import maps, { type MapData } from './data/maps'
import agents, { agentImages } from './data/agents'
import { buildTacticRequest } from './data/knowledgeBase'
import MapCanvas from './components/MapCanvas/MapCanvas'
import AgentPanel from './components/AgentPanel/AgentPanel'
import Timeline from './components/Timeline/Timeline'
import TemplateManager from './components/TemplateManager/TemplateManager'
import ToolPalette from './components/ToolPalette/ToolPalette'
import SplashScreen from './components/SplashScreen/SplashScreen'
import HelpPanel from './components/HelpPanel/HelpPanel'
import AIPanel from './components/AIPanel/AIPanel'
import AIPage from './components/AIPage/AIPage'
import MatchAnalysisPage from './components/MatchAnalysis/MatchAnalysisPage'
import AuthModal from './components/Auth/AuthModal'
import PrivacyPanel from './components/PrivacyPanel/PrivacyPanel'
import SponsorPanel from './components/SponsorPanel/SponsorPanel'
import AdminPanel from './components/AdminPanel/AdminPanel'
import RoomPanel from './components/RoomPanel/RoomPanel'
import MobileLayout from './components/MobileLayout/MobileLayout'
import TacticsGallery from './components/Community/TacticsGallery'
import TacticsDetail from './components/Community/TacticsDetail'
import CreateShare from './components/Community/CreateShare'
import ForumPage from './components/Community/ForumPage'
import PostDetail from './components/Community/PostDetail'
import CreatePost from './components/Community/CreatePost'
import ProfilePage from './components/Community/ProfilePage'
import LineupsPage from './components/Community/LineupsPage'
import LineupsDetail from './components/Community/LineupsDetail'
import LineupsCreate from './components/Community/LineupsCreate'
import NotificationBell from './components/Community/NotificationBell'
import { ToastProvider, useToast } from './components/Toast/Toast'
import { TacticsProvider, useTactics } from './store/TacticsContext'
import { AuthProvider, useAuth } from './store/AuthContext'

function AppInner({ navbarAnimate, panelAnimate, canvasAnimate, timelineAnimate }: { navbarAnimate: boolean; panelAnimate: boolean; canvasAnimate: boolean; timelineAnimate: boolean }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [selectedMap, setSelectedMap] = useState<MapData>(maps[0])
  const [showTemplates, setShowTemplates] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showAIPage, setShowAIPage] = useState(false)
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showSponsor, setShowSponsor] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showRoom, setShowRoom] = useState(false)
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(false)
  const [tacticPrompt, setTacticPrompt] = useState<string | undefined>(undefined)
  const [showCommunity, setShowCommunity] = useState(false)
  const [commView, setCommView] = useState<'gallery' | 'detail' | 'create' | 'forum' | 'post-detail' | 'post-create' | 'profile' | 'lineups' | 'lineup-detail' | 'lineup-create'>('gallery')
  const [commTacticId, setCommTacticId] = useState('')
  const [commPostId, setCommPostId] = useState('')
  const [commProfileId, setCommProfileId] = useState('')
  const [commLineupId, setCommLineupId] = useState('')
  const { user } = useAuth()
  const [showMapDropdown, setShowMapDropdown] = useState(false)

  // 从社区加载战术到战术板
  const handleLoadCommunityTactic = (data: Record<string, unknown>, mapId: string) => {
    const map = maps.find(m => m.id === mapId)
    if (map) setSelectedMap(map)
    dispatch({
      type: 'LOAD_ALL',
      markers: ((data as any).mk || []).map((m: any) => ({ ...m, id: '', abilityId: m.a, agentId: m.g })),
      drawings: (data as any).dr || [],
      texts: (data as any).tx || [],
      agents: (data as any).ap || [],
      shapes: (data as any).as || [],
      name: (data as any).name || '',
      desc: (data as any).desc || '',
      roster: (data as any).roster || { attack: [], defense: [] },
      tracks: (data as any).tracks || [],
    })
    setShowCommunity(false)
  }

  const { dispatch, side, markers, drawings, textAnnotations, agentPositions, abilityShapes, strategyName, strategyDescription, roster, tracks } = useTactics()
  const toast = useToast()

  const handleSaveProgress = () => {
    const data = {
      mapId: selectedMap.id,
      markers, drawings, textAnnotations, agentPositions, abilityShapes,
      strategyName, strategyDescription, roster, tracks,
    }
    localStorage.setItem('val-tactics-autosave', JSON.stringify(data))
    toast('进度已保存')
  }

  useEffect(() => {
    const raw = localStorage.getItem('val-tactics-autosave')
    if (!raw) return
    try {
      const d = JSON.parse(raw)
      if (!d.mapId) return
      const map = maps.find(m => m.id === d.mapId)
      if (map) setSelectedMap(map)

      dispatch({
        type: 'LOAD_ALL',
        markers: d.markers || [], drawings: d.drawings || [],
        texts: d.textAnnotations || [], agents: d.agentPositions || [],
        shapes: d.abilityShapes || [], name: d.strategyName || '',
        desc: d.strategyDescription || '',
        roster: d.roster || { attack: [], defense: [] }, tracks: d.tracks || [],
      })
    } catch {}
  }, [])

  const handleExportImage = async () => {
    const mapImg = selectedMap.id
    const cw = 1800, ch = 1200
    const canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch
    const ctx = canvas.getContext('2d'); if (!ctx) return

    // 1. 背景 + 地图
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cw, ch)
    const img = new Image()
    img.src = `/images/maps/${mapImg}.png`
    await new Promise<void>((resolve) => { img.onload = () => { ctx.drawImage(img, 0, 0, cw, ch); resolve() }; img.onerror = () => resolve() })

    // 2. 技能形状
    for (const s of abilityShapes) {
      ctx.save()
      ctx.translate(s.x * cw, s.y * ch); ctx.rotate((s.rotation * Math.PI) / 180)
      const agent = agents.find(a => a.id === s.agentId)
      const ab = agent?.abilities.find(a => a.id === s.abilityId)
      const color = ab ? ({ smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655', recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42' } as Record<string, string>)[ab.type] || '#888' : '#888'
      ctx.strokeStyle = color; ctx.fillStyle = color + '25'; ctx.lineWidth = 2
      if (s.shape === 'circle') {
        const r = s.radius * cw
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      } else if (s.shape === 'rect') {
        const hw = s.length * cw / 2, hh = (s.width ?? 0.02) * ch / 2
        ctx.fillRect(-hw, -hh, hw * 2, hh * 2); ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
      } else if (s.shape === 'cone') {
        const len = s.length * cw; const halfA = (s.angle / 2) * Math.PI / 180
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(-halfA) * len, -Math.cos(-halfA) * len)
        ctx.lineTo(Math.sin(halfA) * len, -Math.cos(halfA) * len); ctx.closePath(); ctx.fill(); ctx.stroke()
      } else if (s.shape === 'line') {
        ctx.lineWidth = s.thickness * cw; ctx.strokeStyle = color + '99'
        if (s.path && s.path.length > 1) { ctx.beginPath(); ctx.moveTo((s.path[0].x - s.x) * cw, (s.path[0].y - s.y) * ch); for (let i = 1; i < s.path.length; i++) ctx.lineTo((s.path[i].x - s.x) * cw, (s.path[i].y - s.y) * ch); ctx.stroke() }
        else { const hl = s.length * cw / 2; ctx.beginPath(); ctx.moveTo(0, -hl); ctx.lineTo(0, hl); ctx.stroke() }
      }
      ctx.restore()
    }

    // 3. 绘图
    for (const d of drawings) {
      ctx.strokeStyle = d.color; ctx.fillStyle = d.color + '15'; ctx.lineWidth = d.width * 2
      if (d.type === 'line' || d.type === 'arrow') {
        const [a, b] = d.points; ctx.beginPath(); ctx.moveTo(a.x * cw, a.y * ch); ctx.lineTo(b.x * cw, b.y * ch); ctx.stroke()
      } else if (d.type === 'rect' && d.x !== undefined && d.w !== undefined) {
        const x = Math.min(d.x, d.x + d.w) * cw, y = Math.min(d.y!, d.y! + d.h!) * ch, w = Math.abs(d.w) * cw, h = Math.abs(d.h!) * ch
        ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h)
      } else if (d.type === 'circle' && d.cx !== undefined && d.r !== undefined) {
        ctx.beginPath(); ctx.arc(d.cx * cw, d.cy! * ch, d.r * cw, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      } else if (d.type === 'freehand' && d.points.length > 1) {
        ctx.beginPath(); ctx.moveTo(d.points[0].x * cw, d.points[0].y * ch)
        for (let i = 1; i < d.points.length; i++) ctx.lineTo(d.points[i].x * cw, d.points[i].y * ch); ctx.stroke()
      }
    }

    // 4. 文字
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (const t of textAnnotations) {
      ctx.font = `${t.fontSize * 2}px "PingFang SC","Microsoft YaHei",sans-serif`
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x * cw, t.y * ch)
    }

    // 5. 特工头像
    for (const ap of agentPositions) {
      const agent = agents.find(a => a.id === ap.agentId)
      if (!agent) continue
      const devName = agentImages[agent.id] || agent.id
      const avatarImg = new Image()
      avatarImg.src = `/images/agents/${devName}.png`
      const ax = ap.x * cw, ay = ap.y * ch, ar = 16
      try {
        await new Promise<void>((resolve, reject) => {
          avatarImg.onload = () => resolve()
          avatarImg.onerror = () => reject()
        })
        // 圆形裁剪
        ctx.save()
        ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.closePath()
        ctx.clip()
        ctx.drawImage(avatarImg, ax - ar, ay - ar, ar * 2, ar * 2)
        ctx.restore()
        // 边框
        const borderColor = ap.team === 'attack' ? '#ff4655' : '#50b4f0'
        ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2)
        ctx.strokeStyle = borderColor; ctx.lineWidth = 3; ctx.stroke()
        // 外发光
        ctx.beginPath(); ctx.arc(ax, ay, ar + 2, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke()
      } catch {
        // 加载失败时画彩色圆点兜底
        ctx.fillStyle = ap.team === 'attack' ? '#ff4655' : '#50b4f0'
        ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.fill()
      }
    }

    // 下载
    canvas.toBlob(blob => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = `tactics-${Date.now()}.png`; a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }

  const handleShareLink = () => {
    const data = {
      v: 2, m: selectedMap.id,
      mk: markers.map(m => ({ a: m.abilityId, g: m.agentId, x: Math.round(m.x * 1e4) / 1e4, y: Math.round(m.y * 1e4) / 1e4, s: m.step, t: m.time, n: m.note || undefined })),
      dr: drawings.map(d => ({ ...d })),
      tx: textAnnotations.map(t => ({ ...t })),
      ap: agentPositions.map(a => ({ ...a })),
      as: abilityShapes.map(s => ({ ...s, path: s.path?.map(p => ({ x: Math.round(p.x * 1e4) / 1e4, y: Math.round(p.y * 1e4) / 1e4 })) })),
    }
    const json = JSON.stringify(data)
    if (json.length > 3000) {
      toast('内容过多，建议使用 JSON 导出')
      return
    }
    const hash = btoa(unescape(encodeURIComponent(json)))
    const url = `${window.location.origin}${window.location.pathname}#tactic=${hash}`
    navigator.clipboard.writeText(url).then(() => {
      toast('分享链接已复制到剪贴板！')
    }).catch(() => {
      prompt('复制此链接分享：', url)
    })
  }

  // 从 URL 加载分享的战术
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#tactic=')) return
    try {
      const json = decodeURIComponent(escape(atob(hash.slice('#tactic='.length))))
      const data = JSON.parse(json)
      if (data.v === 2 && data.m) {
        const map = maps.find(m => m.id === data.m)
        if (map) setSelectedMap(map)
        dispatch({
          type: 'LOAD_ALL',
          markers: (data.mk || []).map((m: any) => ({ ...m, id: '', abilityId: m.a, agentId: m.g })),
          drawings: data.dr || [],
          texts: data.tx || [],
          agents: data.ap || [],
          shapes: data.as || [],
          name: '', desc: '',
          roster: { attack: [], defense: [] }, tracks: [],
        })
        // 清除 hash 避免重复加载
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch { /* 忽略无效链接 */ }
  }, [])

  const transformRef = useRef<{ offset: { x: number; y: number }; scale: number; mapW: number; mapH: number; container: HTMLDivElement | null }>({
    offset: { x: 0, y: 0 }, scale: 1, mapW: 1800, mapH: 1200, container: null
  })

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); setShowTemplates(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 移动端独立布局
  if (isMobile) {
    return (
      <div className="app-container">
        <MobileLayout
          mapCanvas={<MapCanvas mapId={selectedMap.id} mapName={selectedMap.name} transformRef={transformRef} />}
          agentPanel={<AgentPanel animate={panelAnimate} />}
          timeline={<Timeline animate={timelineAnimate} />}
          toolbar={<ToolPalette />}
          selectedMap={selectedMap}
          onMapChange={setSelectedMap}
          side={side}
          onSideToggle={() => dispatch({ type: 'SET_SIDE', side: side === 'attack' ? 'defense' : 'attack' })}
          notificationBell={<NotificationBell />}
          user={user}
          onLogin={() => setShowAuthModal(true)}
          onSave={handleSaveProgress}
          onTemplates={() => setShowTemplates(true)}
          communityPanel={
            <>
              {showCommunity && commView === 'gallery' && (
                <TacticsGallery onBack={() => setShowCommunity(false)} onViewTactic={(id) => { setCommTacticId(id); setCommView('detail') }} onCreate={() => setCommView('create')} onViewProfile={(uid) => { setCommProfileId(uid); setCommView('profile') }} onViewForum={() => setCommView('forum')} onViewLineups={() => setCommView('lineups')} />
              )}
              {showCommunity && commView === 'detail' && <TacticsDetail tacticId={commTacticId} onBack={() => setCommView('gallery')} onLoadToBoard={handleLoadCommunityTactic} />}
              {showCommunity && commView === 'create' && <CreateShare mapId={selectedMap.id} onClose={() => setCommView('gallery')} onSuccess={(id) => { setCommTacticId(id); setCommView('detail') }} />}
              {showCommunity && commView === 'forum' && <ForumPage onBack={() => setCommView('gallery')} onViewPost={(id) => { setCommPostId(id); setCommView('post-detail') }} onCreatePost={() => setCommView('post-create')} />}
              {showCommunity && commView === 'post-detail' && <PostDetail postId={commPostId} onBack={() => setCommView('forum')} />}
              {showCommunity && commView === 'post-create' && <CreatePost onClose={() => setCommView('forum')} onSuccess={(id) => { setCommPostId(id); setCommView('post-detail') }} />}
              {showCommunity && commView === 'profile' && <ProfilePage userId={commProfileId} onBack={() => setCommView('gallery')} onViewTactic={(id) => { setCommTacticId(id); setCommView('detail') }} onViewPost={(id) => { setCommPostId(id); setCommView('post-detail') }} onViewLineup={(id) => { setCommLineupId(id); setCommView('lineup-detail') }} />}
              {showCommunity && commView === 'lineups' && <LineupsPage onBack={() => setCommView('gallery')} onViewLineup={(id) => { setCommLineupId(id); setCommView('lineup-detail') }} onCreateLineup={() => setCommView('lineup-create')} />}
              {showCommunity && commView === 'lineup-detail' && <LineupsDetail lineupId={commLineupId} onBack={() => setCommView('lineups')} />}
              {showCommunity && commView === 'lineup-create' && <LineupsCreate mapId={selectedMap.id} onClose={() => setCommView('lineups')} onSuccess={(id) => { setCommLineupId(id); setCommView('lineup-detail') }} />}
            </>
          }
        />
        {/* 全局弹窗 */}
        {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} mapId={selectedMap.id} onLoadMap={(id) => { const m = maps.find(x => x.id === id); if (m) setSelectedMap(m) }} onExportImage={handleExportImage} onShareLink={handleShareLink} />}
        {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
        {showAIPage && <AIPage mapId={selectedMap.id} mapName={selectedMap.name} onBack={() => { setShowAIPage(false); setTacticPrompt(undefined) }} initialPrompt={tacticPrompt} />}
        {showMatchAnalysis && <MatchAnalysisPage onBack={() => setShowMatchAnalysis(false)} />}
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        {showPrivacy && <PrivacyPanel onClose={() => setShowPrivacy(false)} />}
        {showSponsor && <SponsorPanel onClose={() => setShowSponsor(false)} />}
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showRoom && <RoomPanel mapId={selectedMap.id} side={side} onClose={() => setShowRoom(false)} onJoined={(id) => { sessionStorage.setItem('room-id', id); setShowRoom(false) }} />}
      {showRoom && <RoomPanel mapId={selectedMap.id} side={side} onClose={() => setShowRoom(false)} onJoined={() => setShowRoom(false)} />}
      </div>
    )
  }

  return (
    <div className="app-container">
      <nav className={`navbar ${navbarAnimate ? 'navbar--enter' : ''}`}>
        <span className="navbar__dot" />
        <span className="navbar__logo">TACTICS</span>
        <div className="navbar__divider" />
        <div className="navbar__mapTrigger" style={{ position: 'relative' }}>
          <button className="navbar__mapBtn" onClick={() => setShowMapDropdown(v => !v)}>
            <span className="navbar__mapBtnDot" />
            {selectedMap.name}
            <span className={`navbar__mapBtnArrow ${showMapDropdown ? 'navbar__mapBtnArrowOpen' : ''}`}>▾</span>
          </button>
          {showMapDropdown && (
            <>
              <div className="navbar__mapOverlay" onClick={() => setShowMapDropdown(false)} />
              <div className="navbar__mapDropdown">
                {maps.map((m, i) => (
                  <button key={m.id}
                    className={`navbar__mapItem ${selectedMap.id === m.id ? 'navbar__mapItemActive' : ''}`}
                    onClick={() => { setSelectedMap(m); setShowMapDropdown(false) }}
                    style={{ animationDelay: `${i * .04}s` }}>
                    <span className="navbar__mapItemName">{m.name}</span>
                    <span className="navbar__mapItemEn">{m.nameEn}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button className={`navbar__sideBtn ${side === 'attack' ? 'navbar__sideBtnAttack' : 'navbar__sideBtnDefense'}`}
          onClick={() => dispatch({ type: 'SET_SIDE', side: side === 'attack' ? 'defense' : 'attack' })}>
          <span className="navbar__sideBtnText" key={side}>{side === 'attack' ? 'Ω 欧米茄' : 'α 阿尔法'}</span>
        </button>
        <button className="btn mobile-menu-btn" onClick={() => setMobileSidebarOpen(v => !v)}
          style={{ display: 'none' }}>☰</button>
        <div className="navbar__actions">
          <button className="navbar__btn" onClick={() => setShowTemplates(true)}>📁 模板管理</button>
          <button className="navbar__btn" onClick={handleSaveProgress}>💾 保存进度</button>
          <div className="navbar__aiDropdown" style={{ position: 'relative' }}>
            <button className="navbar__btn" onClick={() => setShowAIDropdown(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="18" height="18" style={{ flexShrink: 0 }}>
                <defs><linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
                <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#navLogoGrad)" strokeWidth="2" transform="rotate(-12,37,39)"/>
                <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#navLogoGrad)" opacity="0.25" transform="rotate(5,53,35)"/>
                <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#navLogoGrad)" strokeWidth="2" transform="rotate(-3,44,54)"/>
                <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#navLogoGrad)" opacity="0.35" transform="rotate(10,61,51)"/>
                <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#navLogoGrad)" strokeWidth="2" transform="rotate(-8,74,68)"/>
                <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
              </svg>
              T教练 ▾
            </button>
            {showAIDropdown && (
              <>
                <div className="navbar__aiDropdownOverlay" onClick={() => setShowAIDropdown(false)} />
                <div className="navbar__aiDropdownMenu">
                  <button className="navbar__aiDropdownItem" onClick={() => { setShowAIPanel(true); setShowAIDropdown(false) }}>
                    <span>侧边栏</span>
                  </button>
                  <button className="navbar__aiDropdownItem" onClick={() => { setShowAIPage(true); setShowAIDropdown(false) }}>
                    <span>主页面</span>
                  </button>
                  <div className="navbar__aiDropdownDivider" style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 8px' }} />
                  <button className="navbar__aiDropdownItem" onClick={() => {
                    setTacticPrompt(buildTacticRequest(selectedMap.name, side, agentPositions, abilityShapes, drawings, textAnnotations, markers, roster))
                    setShowAIPage(true)
                    setShowAIDropdown(false)
                  }} style={{ color: '#f0c0ff' }}>
                    <span>AI 生成战术</span>
                  </button>
                  <div className="navbar__aiDropdownDivider" style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 8px' }} />
                  <button className="navbar__aiDropdownItem" onClick={() => { setShowMatchAnalysis(true); setShowAIDropdown(false) }}>
                    <span>数据分析</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <NotificationBell />
          <button className="navbar__btn" onClick={() => {
            if (user) {
              setCommProfileId(user.id); setCommView('profile'); setShowCommunity(true)
            } else {
              setShowAuthModal(true)
            }
          }}
            style={user ? { color: '#05F8F8', borderColor: 'rgba(5,248,248,.2)' } : undefined}>
            {user ? `${user.email?.split('@')[0]}` : '登录'}
          </button>
          <a className="navbar__btn" href="/changelog.html" target="_blank" style={{ fontSize: 12, textDecoration: 'none' }}>更新公告</a>
          <button className="navbar__btn" onClick={() => setShowPrivacy(true)} style={{ fontSize: 12 }}>📜 隐私条款</button>
          <button className="navbar__btn" onClick={() => setShowRoom(true)} style={{ color: '#f0c0ff', borderColor: 'rgba(240,192,255,.15)' }}>协作</button>
          <button className="navbar__btn" onClick={() => setShowRoom(true)} style={{ color: '#f0c0ff', borderColor: 'rgba(240,192,255,.15)' }}>协作</button>
          <button className="navbar__btn" onClick={() => { setShowCommunity(true); setCommView('gallery') }} style={{ color: '#05F8F8', borderColor: 'rgba(5,248,248,.15)' }}>社区</button>
          <button className="navbar__btn" onClick={() => setShowHelp(true)}>使用手册</button>
          <button className="navbar__btn" onClick={() => setShowSponsor(true)} style={{ color: '#ffd700', borderColor: 'rgba(255,215,0,.2)' }}>特别鸣谢</button>
          <button className="navbar__btn" onClick={() => setShowAdmin(true)} style={{ fontSize: 10, opacity: .3 }} title="管理">⚙</button>
          <a className="navbar__btn" href="https://www.ifdian.net/a/mjj666" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#f0a0f0', borderColor: 'rgba(227,73,237,.25)', background: 'rgba(227,73,237,.06)' }}>爱发电</a>
        </div>
      </nav>

      <div className="main-area">
        {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}
        <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <AgentPanel animate={panelAnimate} />
        </aside>
        <div className={`canvas-area ${canvasAnimate ? 'canvas-area--enter' : ''}`}>
          {/* 四角L形装饰 — 对标顶配.corner */}
          <div className="canvas-corner canvas-cornerTL"><div className="canvas-cornerDot" /></div>
          <div className="canvas-corner canvas-cornerTR"><div className="canvas-cornerDot" /></div>
          <div className="canvas-corner canvas-cornerBL"><div className="canvas-cornerDot" /></div>
          <div className="canvas-corner canvas-cornerBR"><div className="canvas-cornerDot" /></div>
          {/* 旋转光环 — 对标顶配.halo */}
          <div className="canvas-halo" />
          <div className="canvas-halo2" />
          {/* 粒子 — 对标顶配.trail */}
          <div className="canvas-particle p1" /><div className="canvas-particle p2" />
          <div className="canvas-particle p3" /><div className="canvas-particle p4" />
          <div className="canvas-particle p5" /><div className="canvas-particle p6" />
          <div className="canvas-particle p7" /><div className="canvas-particle p8" />
          <div className="canvas-particle p9" /><div className="canvas-particle p10" />
          <ToolPalette />
          <MapCanvas mapId={selectedMap.id} mapName={selectedMap.name} transformRef={transformRef} />
        </div>
        <aside className={`sidebar sidebar--right ${mobileTimelineOpen ? 'mobile-open' : ''}`}>
          <Timeline animate={timelineAnimate} />
        </aside>
      </div>
      {/* 移动端浮动按钮 */}
      <button className="mobile-float-btn" style={{ bottom: 80, right: 16 }}
        onClick={() => setMobileSidebarOpen(s => !s)}
        aria-label="侧边栏">{mobileSidebarOpen ? 'x' : '+'}</button>
      <button className="mobile-float-btn" style={{ bottom: 128, right: 16 }}
        onClick={() => setMobileTimelineOpen(s => !s)}
        aria-label="时间轴">...</button>
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} mapId={selectedMap.id} onLoadMap={(id) => { const m = maps.find(x => x.id === id); if (m) setSelectedMap(m) }} onExportImage={handleExportImage} onShareLink={handleShareLink} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showAIPanel && <AIPanel mapId={selectedMap.id} mapName={selectedMap.name} onClose={() => setShowAIPanel(false)} />}
      {showAIPage && <AIPage mapId={selectedMap.id} mapName={selectedMap.name} onBack={() => { setShowAIPage(false); setTacticPrompt(undefined) }} initialPrompt={tacticPrompt} />}
      {showMatchAnalysis && <MatchAnalysisPage onBack={() => setShowMatchAnalysis(false)} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showPrivacy && <PrivacyPanel onClose={() => setShowPrivacy(false)} />}
      {showSponsor && <SponsorPanel onClose={() => setShowSponsor(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showRoom && <RoomPanel mapId={selectedMap.id} side={side} onClose={() => setShowRoom(false)} onJoined={(id) => { sessionStorage.setItem('room-id', id); setShowRoom(false) }} />}
      {showRoom && <RoomPanel mapId={selectedMap.id} side={side} onClose={() => setShowRoom(false)} onJoined={() => setShowRoom(false)} />}
      {showCommunity && commView === 'gallery' && (
        <TacticsGallery
          onBack={() => setShowCommunity(false)}
          onViewTactic={(id) => { setCommTacticId(id); setCommView('detail') }}
          onCreate={() => setCommView('create')}
          onViewProfile={(uid) => { setCommProfileId(uid); setCommView('profile') }}
          onViewForum={() => setCommView('forum')}
          onViewLineups={() => setCommView('lineups')}
        />
      )}
      {showCommunity && commView === 'detail' && (
        <TacticsDetail
          tacticId={commTacticId}
          onBack={() => setCommView('gallery')}
          onLoadToBoard={handleLoadCommunityTactic}
        />
      )}
      {showCommunity && commView === 'create' && (
        <CreateShare
          mapId={selectedMap.id}
          onClose={() => setCommView('gallery')}
          onSuccess={(id) => { setCommTacticId(id); setCommView('detail') }}
        />
      )}
      {showCommunity && commView === 'forum' && (
        <ForumPage
          onBack={() => setCommView('gallery')}
          onViewPost={(id) => { setCommPostId(id); setCommView('post-detail') }}
          onCreatePost={() => setCommView('post-create')}
        />
      )}
      {showCommunity && commView === 'post-detail' && (
        <PostDetail postId={commPostId} onBack={() => setCommView('forum')} />
      )}
      {showCommunity && commView === 'post-create' && (
        <CreatePost
          onClose={() => setCommView('forum')}
          onSuccess={(id) => { setCommPostId(id); setCommView('post-detail') }}
        />
      )}
      {showCommunity && commView === 'profile' && (
        <ProfilePage
          userId={commProfileId}
          onBack={() => setCommView('gallery')}
          onViewTactic={(id) => { setCommTacticId(id); setCommView('detail') }}
          onViewPost={(id) => { setCommPostId(id); setCommView('post-detail') }}
        />
      )}
      {showCommunity && commView === 'lineups' && (
        <LineupsPage
          onBack={() => setCommView('gallery')}
          onViewLineup={(id) => { setCommLineupId(id); setCommView('lineup-detail') }}
          onCreateLineup={() => setCommView('lineup-create')}
        />
      )}
      {showCommunity && commView === 'lineup-detail' && (
        <LineupsDetail lineupId={commLineupId} onBack={() => setCommView('lineups')} />
      )}
      {showCommunity && commView === 'lineup-create' && (
        <LineupsCreate
          mapId={selectedMap.id}
          onClose={() => setCommView('lineups')}
          onSuccess={(id) => { setCommLineupId(id); setCommView('lineup-detail') }}
        />
      )}
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [navbarAnimate, setNavbarAnimate] = useState(false)
  const [panelAnimate, setPanelAnimate] = useState(false)
  const [canvasAnimate, setCanvasAnimate] = useState(false)
  const [timelineAnimate, setTimelineAnimate] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') setShowSplash(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSplashEnter = () => {
    setShowSplash(false)
    setNavbarAnimate(true)
    setPanelAnimate(true)
    setCanvasAnimate(true)
    setTimelineAnimate(true)
  }

  return (
    <AuthProvider>
      <TacticsProvider>
        <ToastProvider>
          {showSplash && <SplashScreen onEnter={handleSplashEnter} />}
          <AppInner navbarAnimate={navbarAnimate} panelAnimate={panelAnimate} canvasAnimate={canvasAnimate} timelineAnimate={timelineAnimate} />
        </ToastProvider>
      </TacticsProvider>
    </AuthProvider>
  )
}
