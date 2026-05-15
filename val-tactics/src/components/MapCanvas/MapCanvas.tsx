import { useRef, useEffect, useCallback, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
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

// ====== 地图布局绘制（与之前相同） ======

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
    drawCover(ctx, w*0.55, h*0.42, 20); drawCover(ctx, w*0.38, h*0.5, 18)
    drawSite(ctx, w*0.72, h*0.28, 'A', '#ff4655'); drawSite(ctx, w*0.28, h*0.72, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.95)
  },
  bind: (ctx, w, h) => {
    drawLane(ctx, w*0.2, 0, w*0.08, h); drawLane(ctx, w*0.6, 0, w*0.08, h)
    drawBuilding(ctx, w*0.3, h*0.15, w*0.2, h*0.2); drawBuilding(ctx, w*0.15, h*0.5, w*0.15, h*0.2); drawBuilding(ctx, w*0.55, h*0.5, w*0.2, h*0.25)
    drawCover(ctx, w*0.35, h*0.4, 18); drawCover(ctx, w*0.25, h*0.72, 16)
    ctx.strokeStyle = '#f0c850'; ctx.lineWidth = 1; ctx.setLineDash([3,3]); ctx.strokeRect(w*0.31, h*0.18, 15, 15); ctx.strokeRect(w*0.7, h*0.6, 15, 15); ctx.setLineDash([])
    ctx.fillStyle = '#f0c850'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillText('TP', w*0.31+8, h*0.18+12); ctx.fillText('TP', w*0.7+8, h*0.6+12)
    drawSite(ctx, w*0.72, h*0.25, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.95)
  },
  icebox: (ctx, w, h) => {
    drawLane(ctx, w*0.12, 0, w*0.07, h); drawLane(ctx, w*0.5, 0, w*0.06, h); drawLane(ctx, w*0.8, 0, w*0.07, h)
    drawBuilding(ctx, w*0.22, h*0.3, w*0.2, h*0.18); drawBuilding(ctx, w*0.58, h*0.55, w*0.18, h*0.2); drawBuilding(ctx, w*0.7, h*0.15, w*0.15, h*0.12)
    drawCover(ctx, w*0.4, h*0.35, 15); drawCover(ctx, w*0.72, h*0.35, 14)
    drawSite(ctx, w*0.75, h*0.28, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.68, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.05, w*0.5, h*0.95)
  },
  split: (ctx, w, h) => {
    drawLane(ctx, w*0.1, 0, w*0.08, h); drawLane(ctx, w*0.46, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.1, w*0.18, h*0.25); drawBuilding(ctx, w*0.55, h*0.35, w*0.22, h*0.22); drawBuilding(ctx, w*0.2, h*0.55, w*0.2, h*0.2)
    drawCover(ctx, w*0.35, h*0.42, 16); drawCover(ctx, w*0.28, h*0.72, 18)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.18, h*0.75, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  pearl: (ctx, w, h) => {
    drawLane(ctx, w*0.12, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.25, h*0.2, w*0.18, h*0.15); drawBuilding(ctx, w*0.55, h*0.25, w*0.2, h*0.18)
    drawBuilding(ctx, w*0.58, h*0.6, w*0.2, h*0.18); drawBuilding(ctx, w*0.2, h*0.6, w*0.15, h*0.15)
    drawCover(ctx, w*0.4, h*0.35, 17); drawCover(ctx, w*0.65, h*0.48, 15)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.2, h*0.72, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  fracture: (ctx, w, h) => {
    drawLane(ctx, w*0.08, 0, w*0.08, h); drawLane(ctx, w*0.46, 0, w*0.06, h); drawLane(ctx, w*0.85, 0, w*0.08, h)
    drawBuilding(ctx, w*0.2, h*0.1, w*0.16, h*0.15); drawBuilding(ctx, w*0.62, h*0.1, w*0.16, h*0.15)
    drawBuilding(ctx, w*0.42, h*0.4, w*0.16, h*0.2); drawBuilding(ctx, w*0.2, h*0.7, w*0.18, h*0.15); drawBuilding(ctx, w*0.6, h*0.7, w*0.18, h*0.15)
    drawCover(ctx, w*0.5, h*0.28, 18); drawCover(ctx, w*0.5, h*0.72, 18)
    drawSite(ctx, w*0.8, h*0.5, 'A', '#ff4655'); drawSite(ctx, w*0.18, h*0.5, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.05, w*0.5, h*0.94)
  },
  haven: (ctx, w, h) => {
    drawLane(ctx, w*0.15, 0, w*0.07, h); drawLane(ctx, w*0.5, 0, w*0.06, h); drawLane(ctx, w*0.8, 0, w*0.07, h)
    drawBuilding(ctx, w*0.25, h*0.3, w*0.16, h*0.15); drawBuilding(ctx, w*0.55, h*0.25, w*0.18, h*0.18); drawBuilding(ctx, w*0.6, h*0.58, w*0.2, h*0.18)
    drawCover(ctx, w*0.35, h*0.42, 15); drawCover(ctx, w*0.68, h*0.45, 16)
    drawSite(ctx, w*0.78, h*0.2, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.72, 'B', '#50b4f0'); drawSite(ctx, w*0.5, h*0.55, 'C', '#f0c850')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.93)
  },
  sunset: (ctx, w, h) => {
    drawLane(ctx, w*0.18, 0, w*0.07, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.78, 0, w*0.07, h)
    drawBuilding(ctx, w*0.28, h*0.15, w*0.16, h*0.18); drawBuilding(ctx, w*0.55, h*0.35, w*0.2, h*0.2); drawBuilding(ctx, w*0.22, h*0.55, w*0.18, h*0.2)
    drawCover(ctx, w*0.4, h*0.38, 16); drawCover(ctx, w*0.65, h*0.52, 14)
    drawSite(ctx, w*0.75, h*0.25, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  lotus: (ctx, w, h) => {
    drawLane(ctx, w*0.1, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.82, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.2, w*0.18, h*0.16); drawBuilding(ctx, w*0.56, h*0.25, w*0.2, h*0.18); drawBuilding(ctx, w*0.58, h*0.55, w*0.18, h*0.2)
    drawCover(ctx, w*0.38, h*0.38, 16); drawCover(ctx, w*0.65, h*0.45, 14)
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
  ctx.fillStyle = '#2a2a2a'; ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('将图片命名为 ' + mapId + '.png 放入 public/images/maps/', w * 0.5, h * 0.99)
}

// ====== 获取技能信息 ======

function getAbilityInfo(abilityId: string, agentId: string) {
  const agent = agents.find(a => a.id === agentId)
  const ability = agent?.abilities.find(a => a.id === abilityId)
  return { agentName: agent?.name || '', abilityName: ability?.name || '', abilityKey: ability?.key || '', agentRole: agent?.role || '' }
}

const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

// ====== MapCanvas 组件 ======

export default function MapCanvas({ mapId, mapName, transformRef }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })
  const { markers, selectedId, selectMarker, updateMarker, removeMarker } = useTactics()

  // 同步 transform 给外部（用于拖放坐标转换）
  useEffect(() => {
    transformRef.current = { offset, scale, mapW, mapH, container: containerRef.current }
  })

  // 拖放目标
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: 'map-canvas' })

  const mapW = 1800
  const mapH = 1200

  // 窗口大小适配
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setCanvasSize({ w: clientWidth, h: clientHeight })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 渲染地图
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { w, h } = canvasSize
    const dpr = window.devicePixelRatio
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'

    const draw = (useImage: HTMLImageElement | null) => {
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(offset.x, offset.y); ctx.scale(scale, scale)
      if (useImage) { ctx.drawImage(useImage, 0, 0, mapW, mapH) }
      else { drawPlaceholderMap(ctx, mapId, mapW, mapH) }
      ctx.restore()
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = 'bold 60px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
      ctx.fillText(mapName.toUpperCase(), w - 32, h - 32)
      ctx.restore()
    }

    draw(null)
    const img = new Image()
    img.onload = () => draw(img)
    img.onerror = () => {}
    img.src = `/images/maps/${mapId}.png`
  }, [canvasSize, offset, scale, mapId, mapName])

  useEffect(() => { render() }, [render])

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.max(0.3, Math.min(3, prev * factor)))
    setOffset(prev => ({
      x: mx - factor * (mx - prev.x),
      y: my - factor * (my - prev.y)
    }))
  }, [])

  // 拖拽平移
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    selectMarker(null)
    e.preventDefault()
  }, [offset, selectMarker])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current) return
      setOffset({ x: dragStart.current.ox + e.clientX - dragStart.current.x, y: dragStart.current.oy + e.clientY - dragStart.current.y })
    }
    const up = () => { isDragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  // 键盘删除
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeMarker(selectedId)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [selectedId, removeMarker])

  // 标记拖拽处理
  const markerDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null)

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, markerId: string) => {
    e.stopPropagation()
    selectMarker(markerId)
    const marker = markers.find(m => m.id === markerId)
    if (!marker) return
    markerDragRef.current = { id: markerId, sx: e.clientX, sy: e.clientY, ox: marker.x, oy: marker.y }
  }, [markers, selectMarker])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!markerDragRef.current) return
      const d = markerDragRef.current
      const dx = (e.clientX - d.sx) / scale / mapW
      const dy = (e.clientY - d.sy) / scale / mapH
      updateMarker(d.id, { x: Math.max(0, Math.min(1, d.ox + dx)), y: Math.max(0, Math.min(1, d.oy + dy)) })
    }
    const up = () => { markerDragRef.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [scale, updateMarker])

  return (
    <div
      ref={(node) => { (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node; setDroppableRef(node) }}
      className={`${styles.container} ${isOver ? styles.containerOver : ''}`}
    >
      <canvas ref={canvasRef} className={styles.canvas} onWheel={handleWheel} onMouseDown={handleMouseDown} />

      {/* 拖放提示 */}
      {isOver && <div className={styles.dropHint}>释放以放置技能</div>}

      {/* 标记层 */}
      {markers.map(marker => {
        const info = getAbilityInfo(marker.abilityId, marker.agentId)
        const agent = agents.find(a => a.id === marker.agentId)
        const ab = agent?.abilities.find(a => a.id === marker.abilityId)
        const color = ab ? typeColors[ab.type] || '#888' : '#888'
        const isSelected = marker.id === selectedId

        return (
          <div
            key={marker.id}
            className={`${styles.marker} ${isSelected ? styles.markerSelected : ''}`}
            style={{
              left: `${(marker.x * mapW * scale + offset.x).toFixed(1)}px`,
              top: `${(marker.y * mapH * scale + offset.y).toFixed(1)}px`,
              borderColor: isSelected ? '#fff' : color,
              background: isSelected ? color + '30' : 'rgba(0,0,0,0.85)'
            }}
            onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
            onClick={(e) => { e.stopPropagation(); selectMarker(marker.id) }}
          >
            <span className={styles.markerStep}>{marker.step}</span>
            <span className={styles.markerKey}>{info.abilityKey}</span>
            <span className={styles.markerName}>{info.abilityName}</span>
          </div>
        )
      })}

      {/* 缩放控件 */}
      <div className={styles.controls}>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.min(3, s * 1.25))}>+</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.max(0.3, s * 0.8))}>-</button>
        <button className={styles.zoomBtn} onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>重置</button>
      </div>
    </div>
  )
}
