import { useRef, useEffect, useCallback, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import DrawingLayer from '../DrawingLayer/DrawingLayer'
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
  const { markers, textAnnotations, agentPositions, selectedId, selectedType, dispatch, side } = useTactics()
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: 'map-canvas' })

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

  // 键盘快捷键
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        if (selectedType === 'marker') dispatch({ type: 'REMOVE_MARKER', id: selectedId })
        else if (selectedType === 'drawing') dispatch({ type: 'REMOVE_DRAWING', id: selectedId })
        else if (selectedType === 'text') dispatch({ type: 'REMOVE_TEXT', id: selectedId })
        else if (selectedType === 'agent') dispatch({ type: 'REMOVE_AGENT_POS', id: selectedId })
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
      ref={(node) => {
        containerRef.current = node
        setDroppableRef(node)
      }}
      className={`${styles.container} ${isOver ? styles.containerOver : ''}`}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className={styles.canvas} />

      <DrawingLayer offset={{ x: offsetX, y: offsetY }} scale={displayScale} mapW={mapW} mapH={mapH} containerRef={containerRef} />

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
