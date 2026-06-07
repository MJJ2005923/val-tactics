import { useState, useRef, useEffect } from 'react'
import './App.css'
import maps, { type MapData } from './data/maps'
import agents, { agentImages } from './data/agents'
import MapCanvas from './components/MapCanvas/MapCanvas'
import AgentPanel from './components/AgentPanel/AgentPanel'
import Timeline from './components/Timeline/Timeline'
import TemplateManager from './components/TemplateManager/TemplateManager'
import ToolPalette from './components/ToolPalette/ToolPalette'
import SplashScreen from './components/SplashScreen/SplashScreen'
import HelpPanel from './components/HelpPanel/HelpPanel'
import AIPanel from './components/AIPanel/AIPanel'
import AIPage from './components/AIPage/AIPage'
import { ToastProvider, useToast } from './components/Toast/Toast'
import { TacticsProvider, useTactics } from './store/TacticsContext'

function AppInner({ navbarAnimate, panelAnimate, canvasAnimate, timelineAnimate }: { navbarAnimate: boolean; panelAnimate: boolean; canvasAnimate: boolean; timelineAnimate: boolean }) {
  const [selectedMap, setSelectedMap] = useState<MapData>(maps[0])
  const [showTemplates, setShowTemplates] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showAIPage, setShowAIPage] = useState(false)
  const [showAIDropdown, setShowAIDropdown] = useState(false)
  const [showMapDropdown, setShowMapDropdown] = useState(false)
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
                </div>
              </>
            )}
          </div>
          <button className="navbar__btn" onClick={() => setShowHelp(true)}>📖 使用手册</button>
          <a className="navbar__btn" href="https://www.ifdian.net/a/mjj666" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#f0a0f0', borderColor: 'rgba(227,73,237,.25)', background: 'rgba(227,73,237,.06)' }}>❤️ 爱发电</a>
        </div>
      </nav>

      <div className="main-area">
        {mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}
        <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
          <AgentPanel animate={panelAnimate} />
        </aside>
        <div className={`canvas-area ${canvasAnimate ? 'canvas-area--enter' : ''}`}>
          {/* 装饰形状 — 对标顶配.sh1/.sh2 */}
          <div className="canvas-deco canvas-deco-ring" />
          <div className="canvas-deco canvas-deco-bar" />
          <div className="canvas-deco canvas-deco-dot canvas-deco-dot1" />
          <div className="canvas-deco canvas-deco-dot canvas-deco-dot2" />
          <ToolPalette />
          <MapCanvas mapId={selectedMap.id} mapName={selectedMap.name} transformRef={transformRef} />
        </div>
        <aside className="sidebar sidebar--right">
          <Timeline animate={timelineAnimate} />
        </aside>
      </div>
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} mapId={selectedMap.id} onLoadMap={(id) => { const m = maps.find(x => x.id === id); if (m) setSelectedMap(m) }} onExportImage={handleExportImage} onShareLink={handleShareLink} />}
      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
      {showAIPanel && <AIPanel mapId={selectedMap.id} mapName={selectedMap.name} onClose={() => setShowAIPanel(false)} />}
      {showAIPage && <AIPage mapId={selectedMap.id} mapName={selectedMap.name} onBack={() => setShowAIPage(false)} />}
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
    <TacticsProvider>
      <ToastProvider>
        {showSplash && <SplashScreen onEnter={handleSplashEnter} />}
        <AppInner navbarAnimate={navbarAnimate} panelAnimate={panelAnimate} canvasAnimate={canvasAnimate} timelineAnimate={timelineAnimate} />
      </ToastProvider>
    </TacticsProvider>
  )
}
