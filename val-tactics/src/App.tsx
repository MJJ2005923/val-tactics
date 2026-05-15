import { useState, useCallback, useRef, useEffect } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import './App.css'
import maps, { type MapData } from './data/maps'
import MapCanvas from './components/MapCanvas/MapCanvas'
import AgentPanel from './components/AgentPanel/AgentPanel'
import Timeline from './components/Timeline/Timeline'
import TemplateManager from './components/TemplateManager/TemplateManager'
import { TacticsProvider, useTactics } from './store/TacticsContext'

function AppInner() {
  const [selectedMap, setSelectedMap] = useState<MapData>(maps[0])
  const [showTemplates, setShowTemplates] = useState(false)
  const { addMarker, markers, loadMarkers } = useTactics()

  const transformRef = useRef<{ offset: { x: number; y: number }; scale: number; mapW: number; mapH: number; container: HTMLDivElement | null }>({
    offset: { x: 0, y: 0 }, scale: 1, mapW: 1800, mapH: 1200, container: null
  })

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over?.id !== 'map-canvas' || !active.data.current) return

    const { ability, agent } = active.data.current as { ability: { id: string }; agent: { id: string } }
    const me = event.activatorEvent as MouseEvent
    const t = transformRef.current
    if (!t.container) return

    const rect = t.container.getBoundingClientRect()
    const sx = me.clientX - rect.left
    const sy = me.clientY - rect.top
    const x = (sx - t.offset.x) / t.scale / t.mapW
    const y = (sy - t.offset.y) / t.scale / t.mapH

    if (x < 0 || x > 1 || y < 0 || y > 1) return

    const maxStep = markers.reduce((max, m) => Math.max(max, m.step), 0)
    addMarker({
      id: '',
      abilityId: ability.id,
      agentId: agent.id,
      x, y,
      step: maxStep + 1,
      time: maxStep * 5,
      note: ''
    })
  }, [addMarker, markers])

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: Date.now(),
      markers: markers.map(m => ({
        abilityId: m.abilityId, agentId: m.agentId,
        x: m.x, y: m.y, step: m.step, time: m.time, note: m.note
      }))
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `tactics-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (!data.markers || !Array.isArray(data.markers)) { alert('无效的战术文件格式'); return }
        const loaded = data.markers.map((m: { abilityId: string; agentId: string; x: number; y: number; step: number; time: number; note: string }, i: number) => ({
          id: 'm_' + Date.now() + '_' + i,
          abilityId: m.abilityId, agentId: m.agentId,
          x: m.x, y: m.y,
          step: m.step || i + 1,
          time: m.time || (i * 5),
          note: m.note || ''
        }))
        loadMarkers(loaded)
      } catch { alert('文件解析失败') }
    }
    input.click()
  }

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        setShowTemplates(true)
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
        <div className="navbar__actions">
          <button className="btn" onClick={() => setShowTemplates(true)}>模板管理</button>
          <button className="btn" onClick={handleImport}>导入</button>
          <button className="btn btn--primary" onClick={handleExport} disabled={markers.length === 0}>导出</button>
        </div>
      </nav>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="main-area">
          <aside className="sidebar">
            <AgentPanel />
          </aside>
          <div className="canvas-area">
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
