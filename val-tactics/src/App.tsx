import { useState, useRef, useEffect } from 'react'
import './App.css'
import maps, { type MapData } from './data/maps'
import MapCanvas from './components/MapCanvas/MapCanvas'
import AgentPanel from './components/AgentPanel/AgentPanel'
import Timeline from './components/Timeline/Timeline'
import TemplateManager from './components/TemplateManager/TemplateManager'
import ToolPalette from './components/ToolPalette/ToolPalette'
import SplashScreen from './components/SplashScreen/SplashScreen'
import { TacticsProvider, useTactics } from './store/TacticsContext'

function AppInner() {
  const [selectedMap, setSelectedMap] = useState<MapData>(maps[0])
  const [showTemplates, setShowTemplates] = useState(false)
  const { dispatch, side } = useTactics()

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
      <nav className="navbar">
        <span className="navbar__logo">TACTICS</span>
        <div className="navbar__divider" />
        <select className="btn" value={selectedMap.id} onChange={(e) => {
          const map = maps.find(m => m.id === e.target.value)
          if (map) setSelectedMap(map)
        }}>
          {maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className={`btn ${side === 'attack' ? 'btn--attack' : 'btn--defense'}`}
          onClick={() => dispatch({ type: 'SET_SIDE', side: side === 'attack' ? 'defense' : 'attack' })}>
          {side === 'attack' ? '进攻方' : '防守方'}
        </button>
        <div className="navbar__actions">
          <button className="btn" onClick={() => setShowTemplates(true)}>模板管理</button>
          <button className="btn btn--primary" onClick={() => setShowTemplates(true)}>导出</button>
        </div>
      </nav>

      <div className="main-area">
        <aside className="sidebar">
          <AgentPanel />
        </aside>
        <div className="canvas-area">
          <ToolPalette />
          <MapCanvas mapId={selectedMap.id} mapName={selectedMap.name} transformRef={transformRef} />
        </div>
      </div>

      <Timeline />
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} />}
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') setShowSplash(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <TacticsProvider>
      {showSplash && <SplashScreen onEnter={() => setShowSplash(false)} />}
      <AppInner />
    </TacticsProvider>
  )
}
