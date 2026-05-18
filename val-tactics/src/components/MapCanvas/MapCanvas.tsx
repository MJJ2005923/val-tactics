import { useRef, useEffect, useCallback, useState } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents, { getAbilityShapeConfig } from '../../data/agents'
import DrawingLayer from '../DrawingLayer/DrawingLayer'
import AbilityShapeLayer from '../AbilityShapeLayer/AbilityShapeLayer'
import TextInputModal from '../TextInputModal/TextInputModal'
import styles from './MapCanvas.module.css'

interface MapCanvasProps {
  mapId: string
  mapName: string
  transformRef: React.MutableRefObject<{
    offset: { x: number; y: number }
    scale: number
    mapW: number
    mapH: number
    container: HTMLDivElement | null
  }>
}

// ====== 地图布局绘制 ======
function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angle = 0) {
  ctx.save()
  if (angle) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate((angle * Math.PI) / 180); ctx.translate(-(x + w / 2), -(y + h / 2)) }
  ctx.fillStyle = '#1e1e1e'; ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = '#2e2e2e'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h)
  ctx.restore()
}
function drawCover(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#222222'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#333333'; ctx.lineWidth = 1; ctx.stroke()
}
function drawSite(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  ctx.save()
  ctx.fillStyle = color + '18'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
  ctx.beginPath(); ctx.arc(x, y, 70, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = color + '40'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, x, y)
  ctx.restore()
}
function drawSpawnMarkers(ctx: CanvasRenderingContext2D, ax: number, ay: number, dx: number, dy: number) {
  ctx.fillStyle = '#ff4655'; ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('▼ 进攻方', ax, ay)
  ctx.fillStyle = '#50b4f0'; ctx.fillText('▲ 防守方', dx, dy)
}
function drawLane(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#181818'; ctx.fillRect(x, y, w, h)
}

const mapLayouts: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  ascent: (ctx, w, h) => {
    drawLane(ctx, w*0.15, 0, w*0.06, h); drawLane(ctx, w*0.47, 0, w*0.06, h); drawLane(ctx, w*0.79, 0, w*0.06, h)
    drawBuilding(ctx, w*0.25, h*0.35, w*0.18, h*0.12); drawBuilding(ctx, w*0.55, h*0.2, w*0.15, h*0.15)
    drawBuilding(ctx, w*0.58, h*0.65, w*0.2, h*0.15); drawBuilding(ctx, w*0.25, h*0.6, w*0.12, h*0.18)
    drawCover(ctx, w*0.55, h*0.42, 20)
    drawSite(ctx, w*0.72, h*0.28, 'A', '#ff4655'); drawSite(ctx, w*0.28, h*0.72, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.95)
  },
  bind: (ctx, w, h) => {
    drawLane(ctx, w*0.2, 0, w*0.08, h); drawLane(ctx, w*0.6, 0, w*0.08, h)
    drawBuilding(ctx, w*0.3, h*0.15, w*0.2, h*0.2); drawBuilding(ctx, w*0.15, h*0.5, w*0.15, h*0.2); drawBuilding(ctx, w*0.55, h*0.5, w*0.2, h*0.25)
    ctx.strokeStyle = '#f0c850'; ctx.lineWidth = 1; ctx.setLineDash([3,3]); ctx.strokeRect(w*0.31, h*0.18, 15, 15); ctx.strokeRect(w*0.7, h*0.6, 15, 15); ctx.setLineDash([])
    ctx.fillStyle = '#f0c850'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillText('TP', w*0.31+8, h*0.18+12); ctx.fillText('TP', w*0.7+8, h*0.6+12)
    drawSite(ctx, w*0.72, h*0.25, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.95)
  },
  icebox: (ctx, w, h) => {
    drawLane(ctx, w*0.12, 0, w*0.07, h); drawLane(ctx, w*0.5, 0, w*0.06, h); drawLane(ctx, w*0.8, 0, w*0.07, h)
    drawBuilding(ctx, w*0.22, h*0.3, w*0.2, h*0.18); drawBuilding(ctx, w*0.58, h*0.55, w*0.18, h*0.2); drawBuilding(ctx, w*0.7, h*0.15, w*0.15, h*0.12)
    drawSite(ctx, w*0.75, h*0.28, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.68, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.05, w*0.5, h*0.95)
  },
  split: (ctx, w, h) => {
    drawLane(ctx, w*0.1, 0, w*0.08, h); drawLane(ctx, w*0.46, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.1, w*0.18, h*0.25); drawBuilding(ctx, w*0.55, h*0.35, w*0.22, h*0.22); drawBuilding(ctx, w*0.2, h*0.55, w*0.2, h*0.2)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.18, h*0.75, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  pearl: (ctx, w, h) => {
    drawLane(ctx, w*0.12, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.25, h*0.2, w*0.18, h*0.15); drawBuilding(ctx, w*0.55, h*0.25, w*0.2, h*0.18)
    drawBuilding(ctx, w*0.58, h*0.6, w*0.2, h*0.18); drawBuilding(ctx, w*0.2, h*0.6, w*0.15, h*0.15)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.2, h*0.72, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  fracture: (ctx, w, h) => {
    drawLane(ctx, w*0.08, 0, w*0.08, h); drawLane(ctx, w*0.46, 0, w*0.06, h); drawLane(ctx, w*0.85, 0, w*0.08, h)
    drawBuilding(ctx, w*0.2, h*0.1, w*0.16, h*0.15); drawBuilding(ctx, w*0.62, h*0.1, w*0.16, h*0.15)
    drawBuilding(ctx, w*0.42, h*0.4, w*0.16, h*0.2); drawBuilding(ctx, w*0.2, h*0.7, w*0.18, h*0.15); drawBuilding(ctx, w*0.6, h*0.7, w*0.18, h*0.15)
    drawSite(ctx, w*0.8, h*0.5, 'A', '#ff4655'); drawSite(ctx, w*0.18, h*0.5, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.05, w*0.5, h*0.94)
  },
  haven: (ctx, w, h) => {
    drawLane(ctx, w*0.15, 0, w*0.07, h); drawLane(ctx, w*0.5, 0, w*0.06, h); drawLane(ctx, w*0.8, 0, w*0.07, h)
    drawBuilding(ctx, w*0.25, h*0.3, w*0.16, h*0.15); drawBuilding(ctx, w*0.55, h*0.25, w*0.18, h*0.18); drawBuilding(ctx, w*0.6, h*0.58, w*0.2, h*0.18)
    drawSite(ctx, w*0.78, h*0.2, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.72, 'B', '#50b4f0'); drawSite(ctx, w*0.5, h*0.55, 'C', '#f0c850')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.93)
  },
  sunset: (ctx, w, h) => {
    drawLane(ctx, w*0.18, 0, w*0.07, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.78, 0, w*0.07, h)
    drawBuilding(ctx, w*0.28, h*0.15, w*0.16, h*0.18); drawBuilding(ctx, w*0.55, h*0.35, w*0.2, h*0.2); drawBuilding(ctx, w*0.22, h*0.55, w*0.18, h*0.2)
    drawSite(ctx, w*0.75, h*0.25, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  lotus: (ctx, w, h) => {
    drawLane(ctx, w*0.1, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.2, w*0.18, h*0.16); drawBuilding(ctx, w*0.56, h*0.25, w*0.2, h*0.18); drawBuilding(ctx, w*0.58, h*0.55, w*0.18, h*0.2)
    ctx.strokeStyle = '#a070d8'; ctx.lineWidth = 1.5; ctx.setLineDash([4,2]); ctx.strokeRect(w*0.46, h*0.4, 20, 20); ctx.setLineDash([])
    ctx.fillStyle = '#a070d8'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.fillText('旋转门', w*0.46+10, h*0.4+13)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.2, h*0.7, 'B', '#50b4f0'); drawSite(ctx, w*0.5, h*0.5, 'C', '#f0c850')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.93)
  }
}

function drawPlaceholderMap(ctx: CanvasRenderingContext2D, mapId: string, w: number, h: number) {
  ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4)
  ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 0.5
  const gs = 50
  for (let x = gs; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = gs; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  const layout = mapLayouts[mapId]
  if (layout) layout(ctx, w, h)
}

// ====== 辅助函数 ======
const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

function getAbilityInfo(abilityId: string, agentId: string) {
  const agent = agents.find(a => a.id === agentId)
  const ability = agent?.abilities.find(a => a.id === abilityId)
  return { agentName: agent?.name || '', abilityName: ability?.name || '', abilityKey: ability?.key || '' }
}

// ====== MapCanvas ======
export default function MapCanvas({ mapId, mapName, transformRef }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 })
  const [scale, setScale] = useState(1)
  const { markers, textAnnotations, agentPositions, selectedId, selectedType, toolMode, drawColor, fontSize, dispatch, side } = useTactics()
  const [isOver, setIsOver] = useState(false)
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [editingText, setEditingText] = useState<{ id: string; text: string; color: string; fontSize: number } | null>(null)

  const mapW = 1800
  const mapH = 1200

  // 计算使地图填充容器的基准缩放
  const fitScale = Math.min(containerSize.w / mapW, containerSize.h / mapH)
  const displayScale = scale * fitScale
  const offsetX = (containerSize.w - mapW * displayScale) / 2
  const offsetY = (containerSize.h - mapH * displayScale) / 2

  // 容器尺寸监听
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setContainerSize({ w: clientWidth, h: clientHeight })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 暴露给外部用于坐标转换
  useEffect(() => {
    transformRef.current = {
      offset: { x: offsetX, y: offsetY },
      scale: displayScale,
      mapW, mapH,
      container: containerRef.current
    }
  })

  // 渲染地图 Canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio
    canvas.width = containerSize.w * dpr; canvas.height = containerSize.h * dpr
    canvas.style.width = containerSize.w + 'px'; canvas.style.height = containerSize.h + 'px'
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, containerSize.w, containerSize.h)

    // 背景
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, containerSize.w, containerSize.h)

    const img = new Image()
    const drawImg = () => {
      ctx.save()
      // 攻防翻转
      if (side === 'defense') {
        ctx.translate(containerSize.w / 2, containerSize.h / 2)
        ctx.rotate(Math.PI)
        ctx.translate(-containerSize.w / 2, -containerSize.h / 2)
      }
      ctx.translate(offsetX, offsetY)
      ctx.scale(displayScale, displayScale)
      ctx.drawImage(img, 0, 0, mapW, mapH)
      ctx.restore()
    }
    const drawFallback = () => {
      ctx.save()
      if (side === 'defense') {
        ctx.translate(containerSize.w / 2, containerSize.h / 2)
        ctx.rotate(Math.PI)
        ctx.translate(-containerSize.w / 2, -containerSize.h / 2)
      }
      ctx.translate(offsetX, offsetY)
      ctx.scale(displayScale, displayScale)
      drawPlaceholderMap(ctx, mapId, mapW, mapH)
      ctx.restore()
    }
    drawFallback()
    img.onload = () => { ctx.clearRect(0, 0, containerSize.w, containerSize.h); drawImg() }
    img.onerror = () => {}
    img.src = `/images/maps/${mapId}.png`
  }, [containerSize, displayScale, offsetX, offsetY, mapId, mapName, side])

  useEffect(() => { render() }, [render])

  // 缩放（滚轮）
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.5, Math.min(3, prev * factor)))
  }, [])

  // 原生拖放 — 接收从侧边栏拖来的技能/头像
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return
    let data: { type: string; agentId: string; abilityId?: string }
    try { data = JSON.parse(raw) } catch { return }
    const t = transformRef.current
    if (!t.container) return
    const rect = t.container.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const x = (sx - offsetX) / (displayScale * mapW)
    const y = (sy - offsetY) / (displayScale * mapH)
    if (x < 0 || x > 1 || y < 0 || y > 1) return

    if (data.type === 'agent') {
      dispatch({ type: 'ADD_AGENT_POS', pos: { id: '', agentId: data.agentId, x, y, team: side } })
    } else if (data.type === 'ability' && data.abilityId) {
      const shapeConfig = getAbilityShapeConfig(data.abilityId)
      if (shapeConfig) {
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: data.abilityId, agentId: data.agentId,
          x, y, rotation: 0,
          shape: shapeConfig.shape,
          radius: shapeConfig.radius ?? 0.08,
          angle: shapeConfig.angle ?? 60,
          length: shapeConfig.length ?? 0.10,
          width: shapeConfig.width ?? 0.02,
          thickness: shapeConfig.thickness ?? 0.008,
          iconOnly: shapeConfig.iconOnly ?? false,
        }})
      } else {
        const maxStep = markers.reduce((max, m) => Math.max(max, m.step), 0)
        dispatch({ type: 'ADD_MARKER', marker: { id: '', abilityId: data.abilityId!, agentId: data.agentId, x, y, step: maxStep + 1, time: maxStep * 5, note: '' } })
      }
    }
  }, [offsetX, offsetY, displayScale, mapW, mapH, transformRef, markers, side, dispatch])

  // 地图点击 — 文字工具创建标注
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (toolMode !== 'text') return
    const t = transformRef.current
    if (!t.container) return
    const rect = t.container.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const x = (sx - offsetX) / (displayScale * mapW)
    const y = (sy - offsetY) / (displayScale * mapH)
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    setPendingTextPos({ x, y })
  }, [toolMode, offsetX, offsetY, displayScale, mapW, mapH, transformRef])

  // 键盘快捷键
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        if (selectedType === 'marker') dispatch({ type: 'REMOVE_MARKER', id: selectedId })
        else if (selectedType === 'drawing') dispatch({ type: 'REMOVE_DRAWING', id: selectedId })
        else if (selectedType === 'text') dispatch({ type: 'REMOVE_TEXT', id: selectedId })
        else if (selectedType === 'agent') dispatch({ type: 'REMOVE_AGENT_POS', id: selectedId })
        else if (selectedType === 'abilityShape') dispatch({ type: 'REMOVE_ABILITY_SHAPE', id: selectedId })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault(); dispatch({ type: 'REDO' })
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [selectedId, selectedType, dispatch])

  // 标记拖拽
  const markerDragRef = useRef<{ id: string; type: string; sx: number; sy: number; ox: number; oy: number } | null>(null)

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'marker' | 'text' | 'agent') => {
    e.stopPropagation(); e.preventDefault()
    dispatch({ type: 'SELECT', id, selType: type })
    let ox = 0, oy = 0
    if (type === 'marker') { const m = markers.find(x => x.id === id); if (m) { ox = m.x; oy = m.y } }
    else if (type === 'text') { const t = textAnnotations.find(x => x.id === id); if (t) { ox = t.x; oy = t.y } }
    else if (type === 'agent') { const a = agentPositions.find(x => x.id === id); if (a) { ox = a.x; oy = a.y } }
    markerDragRef.current = { id, type, sx: e.clientX, sy: e.clientY, ox, oy }
  }, [markers, textAnnotations, agentPositions, dispatch])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!markerDragRef.current) return
      const d = markerDragRef.current
      const dx = (e.clientX - d.sx) / displayScale / mapW
      const dy = (e.clientY - d.sy) / displayScale / mapH
      const nx = Math.max(0, Math.min(1, d.ox + dx))
      const ny = Math.max(0, Math.min(1, d.oy + dy))
      if (d.type === 'marker') dispatch({ type: 'UPDATE_MARKER', id: d.id, updates: { x: nx, y: ny } })
      else if (d.type === 'text') dispatch({ type: 'UPDATE_TEXT', id: d.id, updates: { x: nx, y: ny } })
      else if (d.type === 'agent') dispatch({ type: 'UPDATE_AGENT_POS', id: d.id, updates: { x: nx, y: ny } })
    }
    const up = () => { markerDragRef.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [displayScale, dispatch])

  return (
    <div
      ref={(node) => { containerRef.current = node }}
      className={`${styles.container} ${isOver ? styles.containerOver : ''} ${toolMode === 'text' ? styles.containerText : ''}`}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} className={styles.canvas} />

      <DrawingLayer offset={{ x: offsetX, y: offsetY }} scale={displayScale} mapW={mapW} mapH={mapH} containerRef={containerRef} />

      <AbilityShapeLayer offset={{ x: offsetX, y: offsetY }} scale={displayScale} mapW={mapW} mapH={mapH} containerRef={containerRef} />

      {isOver && <div className={styles.dropHint}>释放以放置技能</div>}

      {/* 技能标记 */}
      {markers.map(marker => {
        const info = getAbilityInfo(marker.abilityId, marker.agentId)
        const agent = agents.find(a => a.id === marker.agentId)
        const ab = agent?.abilities.find(a => a.id === marker.abilityId)
        const color = ab ? typeColors[ab.type] || '#888' : '#888'
        const isSelected = marker.id === selectedId && selectedType === 'marker'
        return (
          <div key={marker.id}
            className={`${styles.marker} ${isSelected ? styles.markerSelected : ''}`}
            style={{
              left: offsetX + marker.x * mapW * displayScale,
              top: offsetY + marker.y * mapH * displayScale,
              borderColor: isSelected ? '#fff' : color,
              background: isSelected ? color + '30' : 'rgba(0,0,0,0.85)'
            }}
            onMouseDown={(e) => handleMarkerMouseDown(e, marker.id, 'marker')}
          >
            <span className={styles.markerStep}>{marker.step}</span>
            <span className={styles.markerKey}>{info.abilityKey}</span>
            <span className={styles.markerName}>{info.abilityName}</span>
            {marker.note && <span className={styles.markerNote}>{marker.note}</span>}
          </div>
        )
      })}

      {/* 文字标注 */}
      {textAnnotations.map(tx => {
        const isSelected = tx.id === selectedId && selectedType === 'text'
        return (
          <div key={tx.id}
            className={`${styles.textAnno} ${isSelected ? styles.textAnnoSelected : ''}`}
            style={{
              left: offsetX + tx.x * mapW * displayScale,
              top: offsetY + tx.y * mapH * displayScale,
              color: tx.color,
              fontSize: Math.max(10, tx.fontSize * displayScale) + 'px'
            }}
            onMouseDown={(e) => handleMarkerMouseDown(e, tx.id, 'text')}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingText({ id: tx.id, text: tx.text, color: tx.color, fontSize: tx.fontSize })
            }}
          >
            {tx.text}
          </div>
        )
      })}

      {/* 特工位置 */}
      {agentPositions.map(ap => {
        const agent = agents.find(a => a.id === ap.agentId)
        const isSelected = ap.id === selectedId && selectedType === 'agent'
        const teamColor = ap.team === 'attack' ? '#ff4655' : '#50b4f0'
        return (
          <div key={ap.id}
            className={`${styles.agentPos} ${isSelected ? styles.agentPosSelected : ''}`}
            style={{
              left: offsetX + ap.x * mapW * displayScale,
              top: offsetY + ap.y * mapH * displayScale,
              borderColor: teamColor
            }}
            onMouseDown={(e) => handleMarkerMouseDown(e, ap.id, 'agent')}
          >
            <div className={styles.agentPosDot} style={{ background: teamColor }} />
            <span className={styles.agentPosName}>{agent?.name || '?'}</span>
          </div>
        )
      })}

      {/* 文字输入弹窗 — 新建 */}
      {pendingTextPos && (
        <TextInputModal
          x={pendingTextPos.x}
          y={pendingTextPos.y}
          color={drawColor}
          fontSize={fontSize}
          onConfirm={(text, color, fz) => {
            dispatch({ type: 'ADD_TEXT', text: { id: '', x: pendingTextPos.x, y: pendingTextPos.y, text, color, fontSize: fz } })
            setPendingTextPos(null)
          }}
          onCancel={() => setPendingTextPos(null)}
        />
      )}

      {/* 文字输入弹窗 — 编辑 */}
      {editingText && (
        <TextInputModal
          x={0} y={0}
          color={editingText.color}
          fontSize={editingText.fontSize}
          initialText={editingText.text}
          onConfirm={(text, color, fz) => {
            dispatch({ type: 'UPDATE_TEXT', id: editingText.id, updates: { text, color, fontSize: fz } })
            setEditingText(null)
          }}
          onCancel={() => setEditingText(null)}
          onDelete={() => {
            dispatch({ type: 'REMOVE_TEXT', id: editingText.id })
            setEditingText(null)
          }}
        />
      )}

      {/* 缩放控件 */}
      <div className={styles.controls}>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.min(3, s * 1.25))}>+</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.max(0.5, s * 0.8))}>-</button>
        <button className={styles.zoomBtn} onClick={() => setScale(1)}>重置</button>
      </div>
    </div>
  )
}
