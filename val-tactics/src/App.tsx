import { useState, useCallback, useRef, useEffect } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import './App.css'
import maps, { type MapData } from './data/maps'
import MapCanvas from './components/MapCanvas/MapCanvas'
import AgentPanel from './components/AgentPanel/AgentPanel'
import Timeline from './components/Timeline/Timeline'
import TemplateManager from './components/TemplateManager/TemplateManager'
import ToolPalette from './components/ToolPalette/ToolPalette'
import { TacticsProvider, useTactics } from './store/TacticsContext'

function AppInner() {
  const [selectedMap, setSelectedMap] = useState<MapData>(maps[0])
  const [showTemplates, setShowTemplates] = useState(false)
  const { markers, dispatch, side } = useTactics()

  const transformRef = useRef<{ offset: { x: number; y: number }; scale: number; mapW: number; mapH: number; container: HTMLDivElement | null }>({
    offset: { x: 0, y: 0 }, scale: 1, mapW: 1800, mapH: 1200, container: null
  })

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over?.id !== 'map-canvas' || !active.data.current) return
    const data = active.data.current as { ability?: { id: string }; agent?: { id: string }; type?: string }
    const me = event.activatorEvent as MouseEvent
    const t = transformRef.current
    if (!t.container) return

    const rect = t.container.getBoundingClientRect()
    const sx = me.clientX - rect.left; const sy = me.clientY - rect.top
    const x = (sx - t.offset.x) / t.scale / t.mapW
    const y = (sy - t.offset.y) / t.scale / t.mapH
    if (x < 0 || x > 1 || y < 0 || y > 1) return

    if (data.type === 'agent' && data.agent) {
      dispatch({ type: 'ADD_AGENT_POS', pos: { id: '', agentId: data.agent.id, x, y, team: side } })
    } else if (data.ability && data.agent) {
      const maxStep = markers.reduce((max, m) => Math.max(max, m.step), 0)
      dispatch({ type: 'ADD_MARKER', marker: { id: '', abilityId: data.ability.id, agentId: data.agent.id, x, y, step: maxStep + 1, time: maxStep * 5, note: '' } })
    }
  }, [dispatch, markers, side])

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

      <DndContext onDragEnd={handleDragEnd}>
        <div className="main-area">
          <aside className="sidebar">
            <AgentPanel />
          </aside>
          <div className="canvas-area">
            <ToolPalette />
            <MapCanvas mapId={selectedMap.id} mapName={selectedMap.name} transformRef={transformRef} />
          </div>
        </div>
      </DndContext>

      <Timeline />
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <TacticsProvider>
      <AppInner />
    </TacticsProvider>
  )
}
