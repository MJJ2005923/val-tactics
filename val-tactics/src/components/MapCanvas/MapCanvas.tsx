import { useRef, useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTactics } from '../../store/TacticsContext'
import { useToast } from '../Toast/Toast'
import agents, { getAbilityShapeConfig, agentImages } from '../../data/agents'
import type { AbilityShapeConfig } from '../../types'
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
  },
  breeze: (ctx, w, h) => {
    drawLane(ctx, w*0.12, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.80, 0, w*0.08, h)
    drawBuilding(ctx, w*0.2, h*0.15, w*0.18, h*0.15); drawBuilding(ctx, w*0.55, h*0.15, w*0.15, h*0.2)
    drawBuilding(ctx, w*0.55, h*0.55, w*0.18, h*0.2); drawBuilding(ctx, w*0.2, h*0.6, w*0.16, h*0.15)
    drawSite(ctx, w*0.77, h*0.25, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  abyss: (ctx, w, h) => {
    drawLane(ctx, w*0.15, 0, w*0.08, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.80, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.2, w*0.18, h*0.15); drawBuilding(ctx, w*0.55, h*0.3, w*0.18, h*0.18)
    drawBuilding(ctx, w*0.58, h*0.6, w*0.2, h*0.18); drawBuilding(ctx, w*0.2, h*0.6, w*0.15, h*0.15)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.2, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
  },
  saltmine: (ctx, w, h) => {
    drawLane(ctx, w*0.15, 0, w*0.07, h); drawLane(ctx, w*0.48, 0, w*0.06, h); drawLane(ctx, w*0.80, 0, w*0.08, h)
    drawBuilding(ctx, w*0.22, h*0.2, w*0.18, h*0.16); drawBuilding(ctx, w*0.55, h*0.3, w*0.18, h*0.18)
    drawBuilding(ctx, w*0.58, h*0.6, w*0.2, h*0.18); drawBuilding(ctx, w*0.2, h*0.6, w*0.15, h*0.15)
    drawSite(ctx, w*0.78, h*0.22, 'A', '#ff4655'); drawSite(ctx, w*0.22, h*0.7, 'B', '#50b4f0')
    drawSpawnMarkers(ctx, w*0.5, h*0.06, w*0.5, h*0.94)
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

// 拖拽数据暂存（dragOver 时 getData 不可用）
let pendingDragData: { type: string; agentId: string; abilityId?: string } | null = null
export function setPendingDragData(data: typeof pendingDragData) { pendingDragData = data }

// ====== MapCanvas ======
export default function MapCanvas({ mapId, mapName: _mapName, transformRef }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 })
  const [scale, setScale] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 1.5
    return 1
  })
  const [mapRotation, setMapRotation] = useState(0) // 0, 90, 180, 270
  const [mapSize, setMapSize] = useState({ w: 1800, h: 1200 })
  const [mapImgLoaded, setMapImgLoaded] = useState(false)
  const [mapSwitching, setMapSwitching] = useState(false)
  const [panning, setPanning] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [pinch, setPinch] = useState<{ dist: number; scale: number } | null>(null)
  const [longPressMenu, setLongPressMenu] = useState<{ x: number; y: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { markers, drawings, textAnnotations, agentPositions, abilityShapes, selectedId, selectedType, toolMode, drawColor, fontSize, dispatch, side, showAllRanges, broadcastCursor, myUserId, setCursorLayer, isRoomEditor, roomEditorId } = useTactics()
  const toast = useToast()
  const [isOver, setIsOver] = useState(false)
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [editingText, setEditingText] = useState<{ id: string; text: string; color: string; fontSize: number } | null>(null)
  // 拖拽预览
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; abilityId: string; agentId: string; shape: AbilityShapeConfig; color: string } | null>(null)

  // 矩形拖拽绘制
  const [rectDrawing, setRectDrawing] = useState<{
    startX: number; startY: number; currentX: number; currentY: number;
    abilityId: string; agentId: string; config: any; drawing: boolean;
  } | null>(null)

  // 画线模式：线型技能拖放后进入画线（直线/自由绘制）
  const [lineDrawing, setLineDrawing] = useState<{
    mode: 'line' | 'freehand'       // line=两点直线, freehand=拖拽自由绘制
    startX: number; startY: number
    currentX: number; currentY: number
    abilityId: string; agentId: string
    config: AbilityShapeConfig
    path?: { x: number; y: number }[]  // freehand 路径点
    drawing?: boolean                  // freehand 正在绘制中
  } | null>(null)

  const mapW = mapSize.w
  const mapH = mapSize.h

  // 技能放置通知
  const prevShapeCount = useRef(abilityShapes.length)
  useEffect(() => {
    if (abilityShapes.length > prevShapeCount.current) {
      const latest = abilityShapes[abilityShapes.length - 1]
      const agent = agents.find(a => a.id === latest.agentId)
      const ab = agent?.abilities.find(a => a.id === latest.abilityId)
      if (agent && ab) {
        toast(`${agent.name}/${agent.nameEn} · ${ab.key} ${ab.name}`)
      }
    }
    prevShapeCount.current = abilityShapes.length
  }, [abilityShapes.length])

  // 计算使地图填充容器的基准缩放
  const fitScale = Math.min(containerSize.w / mapW, containerSize.h / mapH)
  const displayScale = scale * fitScale
  const offsetX = (containerSize.w - mapW * displayScale) / 2 + panX
  const offsetY = (containerSize.h - mapH * displayScale) / 2 + panY

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

  // 响应触摸拖拽 agent drop
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: Event) => {
      const { agentId, team, clientX, clientY } = (e as CustomEvent).detail
      const rect = el.getBoundingClientRect()
      const x = (clientX - rect.left - offsetX) / (displayScale * mapW)
      const y = (clientY - rect.top - offsetY) / (displayScale * mapH)
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        dispatch({
          type: 'ADD_AGENT_POS',
          pos: {
            agentId,
            x, y,
            team: team || undefined,
          } as any,
        })
      }
    }
    el.addEventListener('touch-agent-drop', handler)
    return () => el.removeEventListener('touch-agent-drop', handler)
  }, [offsetX, offsetY, displayScale, mapW, mapH, dispatch])

  // 全局鼠标位置广播（window级别，不受画布限制）
  useEffect(() => {
    const handler = (e: MouseEvent) => broadcastCursor(e.clientX, e.clientY, myUserId)
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [broadcastCursor, myUserId])

  // 暴露给外部用于坐标转换
  useEffect(() => {
    transformRef.current = {
      offset: { x: offsetX, y: offsetY },
      scale: displayScale,
      mapW, mapH,
      container: containerRef.current
    }
  })

  // 地图切换过渡动画 — 至少暗屏800ms再渐亮
  const switchRef = useRef({ loaded: false, elapsed: false })
  useEffect(() => {
    setMapSwitching(true)
    switchRef.current = { loaded: false, elapsed: false }
    const tryFade = () => { if (switchRef.current.loaded && switchRef.current.elapsed) setMapSwitching(false) }
    const t1 = window.setTimeout(() => { switchRef.current.elapsed = true; tryFade() }, 500)
    return () => clearTimeout(t1)
  }, [mapId])
  useEffect(() => {
    if (mapImgLoaded && mapSwitching) {
      switchRef.current.loaded = true
      if (switchRef.current.elapsed) setMapSwitching(false)
    }
  }, [mapImgLoaded, mapSwitching])

  // 地图图片缓存加载（仅在地图切换时加载）+ 按图片比例调整 mapW/mapH
  useEffect(() => {
    setMapImgLoaded(false)
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      // 使用图片原始比例
      setMapSize({ w: img.naturalWidth, h: img.naturalHeight })
      setMapImgLoaded(true)
    }
    img.onerror = () => { imageRef.current = null; setMapImgLoaded(false) }
    const suffix = side === 'defense' ? '-defense' : ''
    img.src = `/images/maps/${mapId}${suffix}.png`
  }, [mapId, side])

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
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // 背景（透明，让画布背景透出）
    ctx.clearRect(0, 0, containerSize.w, containerSize.h)
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(displayScale, displayScale)
    // 地图旋转（攻防翻转 + 手动旋转）
    const effectiveRotation = (mapRotation + (side === 'defense' ? 180 : 0)) % 360
    if (effectiveRotation !== 0) {
      ctx.translate(mapW / 2, mapH / 2)
      ctx.rotate((effectiveRotation * Math.PI) / 180)
      ctx.translate(-mapW / 2, -mapH / 2)
    }
    if (imageRef.current && mapImgLoaded) {
      ctx.drawImage(imageRef.current, 0, 0, mapW, mapH)
    } else {
      drawPlaceholderMap(ctx, mapId, mapW, mapH)
    }
    ctx.restore()
  }, [containerSize, displayScale, offsetX, offsetY, mapId, mapImgLoaded, side, mapRotation])

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
    // 拖拽预览（用暂存数据，dragOver 时 getData 不可用）
    const pd = pendingDragData
    if (pd?.type === 'ability' && pd.abilityId) {
      const sc = getAbilityShapeConfig(pd.abilityId)
      if (sc) {
        const agent = agents.find(a => a.id === pd.agentId)
        const ab = agent?.abilities.find(a => a.id === pd.abilityId)
        const color = ab ? typeColors[ab.type] || '#888' : '#888'
        const t = transformRef.current; if (!t.container) return
        const rr = t.container.getBoundingClientRect()
        const x = (e.clientX - rr.left - offsetX) / (displayScale * mapW)
        const y = (e.clientY - rr.top - offsetY) / (displayScale * mapH)
        setDragPreview({ x, y, abilityId: pd.abilityId, agentId: pd.agentId, shape: sc, color })
        return
      }
    }
    setDragPreview(null)
  }, [offsetX, offsetY, displayScale, mapW, mapH, transformRef])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
    setDragPreview(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    setDragPreview(null)
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
      dispatch({ type: 'ADD_AGENT_POS', pos: { id: '', agentId: data.agentId, x, y, team: (data as any).team || side } })
    } else if (data.type === 'ability' && data.abilityId) {
      const shapeConfig = getAbilityShapeConfig(data.abilityId)
      if (shapeConfig) {
        // 矩形拖拽绘制
        if (shapeConfig.shape === 'line' || data.abilityId === 'miks-x' || data.abilityId === 'tejo-x' || data.abilityId === 'breach-aftershock' || data.abilityId === 'tejo-q' || data.abilityId === 'phoenix-curveball' || data.abilityId === 'neon-fast-lane' || data.abilityId === 'neon-high-gear' || data.abilityId === 'iso-contingency' || data.abilityId === 'iso-undercut' || data.abilityId === 'iso-kill-contract' || data.abilityId === 'viper-toxic-screen' || data.abilityId === 'waylay-q' || data.abilityId === 'waylay-e' || data.abilityId === 'waylay-x' || data.abilityId === 'omen-paranoia') {
          // 线型技能进入画线模式：先放起点，再拖终点
          const isFH = data.abilityId === 'harbor-high-tide' || data.abilityId === 'phoenix-blaze' || data.abilityId === 'sova-owl-drone' || data.abilityId === 'fade-prowler' || data.abilityId === 'gekko-thrash' || data.abilityId === 'skye-trailblazer' || data.abilityId === 'skye-guiding-light' || data.abilityId === 'tejo-c' || data.abilityId === 'waylay-e'
          setLineDrawing({
            mode: isFH ? 'freehand' : 'line',
            startX: isFH ? x : -1, startY: isFH ? y : -1,
            currentX: isFH ? x : -1, currentY: isFH ? y : -1,
            abilityId: data.abilityId, agentId: data.agentId,
            config: shapeConfig,
          })
        } else {
          dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
            id: '', abilityId: data.abilityId, agentId: data.agentId,
            x, y, rotation: 0,
            shape: shapeConfig.shape,
            radius: shapeConfig.radius ?? 0.08,
            outerRadius: shapeConfig.outerRadius,
            angle: shapeConfig.angle ?? 60,
            length: shapeConfig.length ?? 0.10,
            width: shapeConfig.width ?? 0.02,
            thickness: shapeConfig.thickness ?? 0.008,
            iconOnly: shapeConfig.iconOnly ?? false,
          }})
        }
      } else {
        const maxStep = markers.reduce((max, m) => Math.max(max, m.step), 0)
        dispatch({ type: 'ADD_MARKER', marker: { id: '', abilityId: data.abilityId!, agentId: data.agentId, x, y, step: maxStep + 1, time: maxStep * 5, note: '' } })
      }
    }
  }, [offsetX, offsetY, displayScale, mapW, mapH, transformRef, markers, side, dispatch])

  // 自由绘制：用原生事件绑定到容器元素（绕过 React 合成事件限制）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const toWorld = (sx: number, sy: number) => ({
      x: (sx - offsetX) / (displayScale * mapW),
      y: (sy - offsetY) / (displayScale * mapH),
    })

    const getPos = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      return toWorld(e.clientX - rect.left, e.clientY - rect.top)
    }

    const pathLen = (pts: { x: number; y: number }[]) => {
      let total = 0
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x
        const dy = pts[i].y - pts[i - 1].y
        total += Math.sqrt(dx * dx + dy * dy)
      }
      return total
    }

    const maxLen = (lineDrawing?.abilityId === 'skye-trailblazer' || lineDrawing?.abilityId === 'skye-guiding-light' || lineDrawing?.abilityId === 'tejo-c') ? 999 : (lineDrawing?.config.length ?? 0.50)
    // 斯凯Q：250点 / 斯凯E：200点 / 钛狐C：350点
    const maxPts = lineDrawing?.abilityId === 'skye-trailblazer' ? 250 : lineDrawing?.abilityId === 'skye-guiding-light' ? 200 : lineDrawing?.abilityId === 'tejo-c' ? 350 : Infinity

    const down = (e: MouseEvent) => {
      if (!lineDrawing || lineDrawing.mode !== 'freehand') return
      e.preventDefault(); e.stopPropagation()
      const w = getPos(e)
      freehandRef.current = { drawing: true, path: [{ x: w.x, y: w.y }] }
      setLineDrawing(prev => prev ? { ...prev, drawing: true, path: [{ x: w.x, y: w.y }], currentX: w.x, currentY: w.y } : null)
    }

    const move = (e: MouseEvent) => {
      if (!freehandRef.current.drawing) return
      e.preventDefault()
      const w = getPos(e)
      freehandRef.current.path.push(w)
      // 限制最大长度或最大点数
      if (pathLen(freehandRef.current.path) > maxLen || freehandRef.current.path.length >= maxPts) {
        freehandRef.current.drawing = false
        // 触发保存
        const pts = [...freehandRef.current.path]
        const prev = lineDrawing
        setLineDrawing(null)
        if (prev) {
          let sumX = 0, sumY = 0
          for (const p of pts) { sumX += p.x; sumY += p.y }
          dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
            id: '', abilityId: prev.abilityId, agentId: prev.agentId,
            x: sumX / pts.length, y: sumY / pts.length, rotation: 0,
            shape: 'line',
            radius: prev.config.radius ?? 0.08, angle: 60,
            length: pathLen(pts),
            width: 0.02,
            thickness: prev.config.thickness ?? 0.008,
            iconOnly: prev.config.iconOnly ?? false,
            path: pts,
          }})
        }
        return
      }
      setLineDrawing(prev => prev ? { ...prev, currentX: w.x, currentY: w.y, path: [...freehandRef.current.path] } : null)
    }

    const up = () => {
      if (!freehandRef.current.drawing) return
      freehandRef.current.drawing = false
      const pts = freehandRef.current.path
      const prev2 = lineDrawing
      setLineDrawing(null)
      if (prev2 && pts.length > 1) {
        let sumX = 0, sumY = 0
        for (const p of pts) { sumX += p.x; sumY += p.y }
        const cx = sumX / pts.length
        const cy = sumY / pts.length
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: prev2.abilityId, agentId: prev2.agentId,
          x: cx, y: cy, rotation: 0,
          shape: 'line',
          radius: prev2.config.radius ?? 0.08, angle: 60,
          length: pathLen(pts),
          width: 0.02,
          thickness: prev2.config.thickness ?? 0.008,
          iconOnly: prev2.config.iconOnly ?? false,
          path: pts,
        }})
      }
    }

    el.addEventListener('mousedown', down)
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseup', up)
    return () => {
      el.removeEventListener('mousedown', down)
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseup', up)
    }
  }, [!!lineDrawing, offsetX, offsetY, displayScale, mapW, mapH, transformRef, dispatch])


  // 地图点击 — 画线确认 / 文字工具创建标注
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // 画线模式：点击确认终点/起点（freehand 模式由 mouseup 处理，此处跳过）
    if (lineDrawing && lineDrawing.mode !== 'freehand') {
      const t = transformRef.current
      if (!t.container) return
      const rect = t.container.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      let ex = (sx - offsetX) / (displayScale * mapW)
      let ey = (sy - offsetY) / (displayScale * mapH)
      // 两步点击：先设起点
      if (lineDrawing.startX < 0) {
        setLineDrawing(prev => prev ? { ...prev, startX: ex, startY: ey, currentX: ex, currentY: ey } : null)
        return
      }
      // OmenC：限制终点在20m内，长度按实际配置计算
      let actualLen = 0
      if (lineDrawing.abilityId === 'omen-shrouded-step') {
        const maxLen = lineDrawing.config.length ?? (20 * 7 / 1800)
        const drx = ex - lineDrawing.startX
        const dry = ey - lineDrawing.startY
        const dist = Math.sqrt(drx * drx + dry * dry)
        if (dist > maxLen && dist > 0) {
          const ratio = maxLen / dist
          ex = lineDrawing.startX + drx * ratio
          ey = lineDrawing.startY + dry * ratio
        }
        actualLen = Math.sqrt((ex - lineDrawing.startX) ** 2 + (ey - lineDrawing.startY) ** 2)
      }
      // 猎枭X：固定90m
      let furyLen = 0
      if (lineDrawing.abilityId === 'sova-hunters-fury') {
        const maxLen = lineDrawing.config.length ?? (90 * 7 / 1800)
        const drx = ex - lineDrawing.startX, dry = ey - lineDrawing.startY
        const dist = Math.sqrt(drx * drx + dry * dry)
        if (dist > maxLen && dist > 0) {
          const ratio = maxLen / dist
          ex = lineDrawing.startX + drx * ratio
          ey = lineDrawing.startY + dry * ratio
        }
        furyLen = maxLen
      }
      // 海神X：限制终点在50m范围内
      let hxLen = 0, hxRot = 0
      if (lineDrawing.abilityId === 'harbor-reckoning') {
        const maxLen = lineDrawing.config.length ?? (50 * 7 / 1800)
        const drx = ex - lineDrawing.startX, dry = ey - lineDrawing.startY
        const dist = Math.sqrt(drx * drx + dry * dry)
        if (dist > maxLen && dist > 0) {
          const ratio = maxLen / dist
          ex = lineDrawing.startX + drx * ratio
          ey = lineDrawing.startY + dry * ratio
        }
        hxLen = Math.sqrt((ex - lineDrawing.startX) ** 2 + (ey - lineDrawing.startY) ** 2)
        // 用标准坐标算旋转，避免mapW≠mapH扭曲
        hxRot = Math.atan2(ex - lineDrawing.startX, -(ey - lineDrawing.startY)) * 180 / Math.PI
      }
      const cx = (lineDrawing.startX + ex) / 2
      const cy = (lineDrawing.startY + ey) / 2
      const dx = (ex - lineDrawing.startX) * mapW
      const dy = (ey - lineDrawing.startY) * mapH
      const len = Math.sqrt(dx * dx + dy * dy) / mapW
      const rot = Math.atan2(dx, -dy) * 180 / Math.PI
      // Waylay Q：左键=一段(15m)，右键=两段（和钛狐Q一样，无终点圆）
      if (lineDrawing.abilityId === 'waylay-q') {
        const segLen = lineDrawing.config.length ?? (15 * 7 / 1800)
        const wlRef = multiLineRef.current
        const dxW = (ex - lineDrawing.startX), dyW = (ey - lineDrawing.startY)
        const distW = Math.sqrt(dxW * dxW + dyW * dyW) || 1
        const nx = lineDrawing.startX + (dxW / distW) * segLen
        const ny = lineDrawing.startY + (dyW / distW) * segLen
        if (wlRef.count === 0) {
          // 左键=一段完成
          dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
            id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
            x: (lineDrawing.startX + nx) / 2, y: (lineDrawing.startY + ny) / 2, rotation: 0, shape: 'line',
            radius: 0.08, angle: 60, length: segLen, width: 0.02,
            thickness: lineDrawing.config.thickness ?? 0.003, iconOnly: lineDrawing.config.iconOnly ?? false,
            path: [{ x: lineDrawing.startX, y: lineDrawing.startY }, { x: nx, y: ny }],
          }})
          setLineDrawing(null)
          return
        }
        // 第二段
        wlRef.pts.push({ x: nx, y: ny })
        const allPts = [...wlRef.pts]
        wlRef.pts = []; wlRef.count = 0
        let sxW = 0, syW = 0
        for (const p of allPts) { sxW += p.x; syW += p.y }
        let totalLenW = 0
        for (let i = 1; i < allPts.length; i++) {
          totalLenW += Math.sqrt((allPts[i].x - allPts[i-1].x) ** 2 + (allPts[i].y - allPts[i-1].y) ** 2)
        }
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: sxW / allPts.length, y: syW / allPts.length, rotation: 0, shape: 'line',
          radius: 0.08, angle: 60, length: totalLenW, width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.003, iconOnly: lineDrawing.config.iconOnly ?? false, path: allPts,
        }})
        setLineDrawing(null)
        return
      }
      // 钛狐Q：左键=一段完成，右键=记录第一段继续等第二段
      if (lineDrawing.abilityId === 'tejo-q') {
        const mlr = multiLineRef.current
        if (mlr.count === 0) {
          // 左键点击=一段完成，直接派发
          dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
            id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
            x: (lineDrawing.startX + ex) / 2, y: (lineDrawing.startY + ey) / 2, rotation: 0, shape: 'line',
            radius: lineDrawing.config.radius ?? 0.08, angle: 60,
            length: Math.sqrt((ex - lineDrawing.startX) ** 2 + (ey - lineDrawing.startY) ** 2), width: 0.02,
            thickness: lineDrawing.config.thickness ?? 0.006, iconOnly: lineDrawing.config.iconOnly ?? false,
            path: [{ x: lineDrawing.startX, y: lineDrawing.startY }, { x: ex, y: ey }],
          }})
          setLineDrawing(null)
          return
        }
        // 第二段（右键后再左键）
        mlr.pts.push({ x: ex, y: ey })
        const allPts = [...mlr.pts]
        mlr.pts = []; mlr.count = 0
        let sx3 = 0, sy3 = 0
        for (const p of allPts) { sx3 += p.x; sy3 += p.y }
        let totalLen = 0
        for (let i = 1; i < allPts.length; i++) {
          totalLen += Math.sqrt((allPts[i].x - allPts[i-1].x) ** 2 + (allPts[i].y - allPts[i-1].y) ** 2)
        }
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: sx3 / allPts.length, y: sy3 / allPts.length, rotation: 0, shape: 'line',
          radius: lineDrawing.config.radius ?? 0.08, angle: 60, length: totalLen, width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.006, iconOnly: lineDrawing.config.iconOnly ?? false, path: allPts,
        }})
        setLineDrawing(null)
        return
      }
      if (lineDrawing.abilityId === 'deadlock-annihilation') {
        const mlr = multiLineRef.current
        if (mlr.count === 0) {
          mlr.pts = [{ x: lineDrawing.startX, y: lineDrawing.startY }, { x: ex, y: ey }]
          mlr.count = 1
          setLineDrawing(prev => prev ? { ...prev, startX: ex, startY: ey, currentX: ex, currentY: ey } : null)
          return
        }
        mlr.pts.push({ x: ex, y: ey })
        const allPts = [...mlr.pts]
        mlr.pts = []; mlr.count = 0
        let sx3 = 0, sy3 = 0
        for (const p of allPts) { sx3 += p.x; sy3 += p.y }
        let totalLen = 0
        for (let i = 1; i < allPts.length; i++) {
          totalLen += Math.sqrt((allPts[i].x - allPts[i-1].x) ** 2 + (allPts[i].y - allPts[i-1].y) ** 2)
        }
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: sx3 / allPts.length, y: sy3 / allPts.length, rotation: 0, shape: 'line',
          radius: lineDrawing.config.radius ?? 0.08, angle: 60, length: totalLen, width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.006, iconOnly: lineDrawing.config.iconOnly ?? false, path: allPts,
        }})
        setLineDrawing(null)
        return
      }
      // 固定长度矩形：Iso Q
      if (lineDrawing.abilityId === 'iso-undercut' || lineDrawing.abilityId === 'iso-kill-contract' || lineDrawing.abilityId === 'waylay-x' || lineDrawing.abilityId === 'omen-paranoia') {
        const fixLen = lineDrawing.config.length ?? 0.10
        const fixW = lineDrawing.config.width ?? 0.02
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: cx, y: cy, rotation: rot - 90,
          shape: 'rect', radius: 0.08, angle: 60,
          length: fixLen, width: fixW,
          thickness: 0.008, iconOnly: lineDrawing.config.iconOnly ?? false,
        }})
        setLineDrawing(null)
        return
      }
      // Neon C 固定长度：中点居中，方向由终点决定
      if (lineDrawing.abilityId === 'neon-fast-lane' || lineDrawing.abilityId === 'neon-high-gear' || lineDrawing.abilityId === 'iso-contingency' || lineDrawing.abilityId === 'viper-toxic-screen') {
        const fixLen = lineDrawing.config.length ?? 0.10
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: cx, y: cy, rotation: rot,
          shape: 'line', radius: 0.08, angle: 60,
          length: fixLen, width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.003, iconOnly: lineDrawing.config.iconOnly ?? false,
        }})
        setLineDrawing(null)
        return
      }
      // Phoenix E 弧线：起点+终点自动弧线连接
      if (lineDrawing.abilityId === 'phoenix-curveball') {
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: cx, y: cy, rotation: rot,
          shape: 'line', radius: 0.08, angle: 60,
          length: Math.max(len, 0.02), width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.004, iconOnly: lineDrawing.config.iconOnly ?? false,
        }})
        setLineDrawing(null)
        return
      }
      // 铁臂C：锥形固定20m，起点为锥尖，终点决定方向
      if (lineDrawing.abilityId === 'breach-aftershock') {
        const fixLen = lineDrawing.config.length ?? (20 * 7 / 1800)
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: lineDrawing.startX, y: lineDrawing.startY, rotation: rot,
          shape: 'cone', radius: 0.08, angle: lineDrawing.config.angle ?? 50,
          length: fixLen, width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.008, iconOnly: lineDrawing.config.iconOnly ?? false,
        }})
        setLineDrawing(null)
        return
      }
      // Miks X 锥形拖拽（固定长度）
      if (lineDrawing.abilityId === 'miks-x') {
        dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
          id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
          x: lineDrawing.startX, y: lineDrawing.startY, rotation: rot,
          shape: 'cone', radius: 0.08, angle: lineDrawing.config.angle ?? 55,
          length: lineDrawing.config.length ?? (55 * 7 / 1800), width: 0.02,
          thickness: lineDrawing.config.thickness ?? 0.008, iconOnly: lineDrawing.config.iconOnly ?? false,
        }})
        setLineDrawing(null)
        return
      }
      const isBreachRect = lineDrawing.abilityId === 'breach-fault-line' || lineDrawing.abilityId === 'breach-rolling-thunder' || lineDrawing.abilityId === 'fade-nightfall' || lineDrawing.abilityId === 'vyse-shear' || lineDrawing.abilityId === 'deadlock-sonic-sensor' || lineDrawing.abilityId === 'tejo-x'
      const rw = lineDrawing.abilityId === 'breach-fault-line' ? 15 : lineDrawing.abilityId === 'breach-rolling-thunder' ? 30 : lineDrawing.abilityId === 'fade-nightfall' ? 30 : lineDrawing.abilityId === 'vyse-shear' ? 3 : lineDrawing.abilityId === 'deadlock-sonic-sensor' ? 13 : lineDrawing.abilityId === 'tejo-x' ? 20 : 40
      dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
        id: '', abilityId: lineDrawing.abilityId, agentId: lineDrawing.agentId,
        x: cx, y: cy, rotation: lineDrawing.abilityId === 'harbor-reckoning' ? hxRot : isBreachRect ? (rot - 90) : rot,
        shape: isBreachRect ? 'rect' : 'line',
        radius: lineDrawing.abilityId === 'tejo-x' ? (rw * 7 / 1800) / 2 : 0.08,
        angle: 60,
        length: lineDrawing.abilityId === 'omen-shrouded-step' ? Math.max(actualLen, 0.02)
              : lineDrawing.abilityId === 'harbor-reckoning' ? Math.max(hxLen, 0.02)
              : lineDrawing.abilityId === 'sova-hunters-fury' ? Math.max(furyLen, 0.02)
              : Math.max(len, 0.02),
        width: isBreachRect ? (rw * 7 / 1800) : 0.02,
        thickness: lineDrawing.config.thickness ?? 0.008,
        iconOnly: lineDrawing.config.iconOnly ?? false,
      }})
      setLineDrawing(null)
      return
    }
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
  }, [toolMode, offsetX, offsetY, displayScale, mapW, mapH, transformRef, lineDrawing, dispatch])

  // 画线模式：ESC 取消 + 直线模式鼠标追踪
  useEffect(() => {
    if (!lineDrawing) return
    const move = (e: MouseEvent) => {
      const t = transformRef.current
      if (!t.container) return
      const rect = t.container.getBoundingClientRect()
      let ex = (e.clientX - rect.left - offsetX) / (displayScale * mapW)
      let ey = (e.clientY - rect.top - offsetY) / (displayScale * mapH)
      setLineDrawing(prev => {
        if (!prev) return null
        // 欧门C/猎枭X/铁臂C/铁臂E：限制终点在固定范围内
        if ((prev.abilityId === 'omen-shrouded-step' || prev.abilityId === 'sova-hunters-fury' || prev.abilityId === 'breach-aftershock' || prev.abilityId === 'breach-fault-line' || prev.abilityId === 'breach-rolling-thunder' || prev.abilityId === 'fade-nightfall' || prev.abilityId === 'deadlock-sonic-sensor' || prev.abilityId === 'vyse-shear' || prev.abilityId === 'tejo-x' || prev.abilityId === 'miks-x') && prev.startX >= 0) {
          const maxLen = prev.config.length ?? (20 * 7 / 1800)
          const dx = (ex - prev.startX)
          const dy = (ey - prev.startY)
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > maxLen && dist > 0) {
            const ratio = maxLen / dist
            ex = prev.startX + dx * ratio
            ey = prev.startY + dy * ratio
          }
        }
        return { ...prev, currentX: ex, currentY: ey }
      })
    }
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); freehandRef.current.drawing = false; setLineDrawing(null) }
    }
    // 直线模式跟踪鼠标位置
    if (lineDrawing.mode !== 'freehand') {
      window.addEventListener('mousemove', move)
    }
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('keydown', keydown)
    }
  }, [!!lineDrawing, offsetX, offsetY, displayScale, mapW, mapH, transformRef])

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
      // Ctrl+D 复制选中元素
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId && selectedType) {
        e.preventDefault()
        const offset = 0.012
        if (selectedType === 'abilityShape') {
          const s = abilityShapes.find(x => x.id === selectedId)
          if (s) dispatch({ type: 'ADD_ABILITY_SHAPE', shape: { ...s, id: '', x: s.x + offset, y: s.y + offset, path: s.path?.map(p => ({ ...p })) } })
        } else if (selectedType === 'marker') {
          const m = markers.find(x => x.id === selectedId)
          if (m) dispatch({ type: 'ADD_MARKER', marker: { ...m, id: '', x: m.x + offset, y: m.y + offset, step: m.step + 1 } })
        } else if (selectedType === 'text') {
          const t = textAnnotations.find(x => x.id === selectedId)
          if (t) dispatch({ type: 'ADD_TEXT', text: { ...t, id: '', x: t.x + offset, y: t.y + offset } })
        } else if (selectedType === 'agent') {
          const a = agentPositions.find(x => x.id === selectedId)
          if (a) dispatch({ type: 'ADD_AGENT_POS', pos: { ...a, id: '', x: a.x + offset, y: a.y + offset } })
        } else if (selectedType === 'drawing') {
          const d = drawings.find(x => x.id === selectedId)
          if (d) dispatch({ type: 'ADD_DRAWING', drawing: { ...d, id: '', points: d.points.map(p => ({ x: p.x + offset, y: p.y + offset })) } })
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [selectedId, selectedType, dispatch, abilityShapes, markers, textAnnotations, agentPositions, drawings])

  // 标记拖拽
  const markerDragRef = useRef<{ id: string; type: string; sx: number; sy: number; ox: number; oy: number } | null>(null)
  // 自由绘制状态（用 ref 避免 effect 重注册打断绘制）
  const freehandRef = useRef<{ drawing: boolean; path: { x: number; y: number }[] }>({ drawing: false, path: [] })
  const multiLineRef = useRef<{ pts: { x: number; y: number }[], count: number }>({ pts: [], count: 0 })

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

  // 钛狐Q右键=两段模式（原生contextmenu事件阻止菜单+处理逻辑）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      if (lineDrawing && (lineDrawing.abilityId === 'tejo-q' || lineDrawing.abilityId === 'waylay-q') && lineDrawing.startX >= 0) {
        e.preventDefault()
        const rr = el.getBoundingClientRect()
        const ex2 = (e.clientX - rr.left - offsetX) / (displayScale * mapW)
        const ey2 = (e.clientY - rr.top - offsetY) / (displayScale * mapH)
        // waylay-q：固定段长
        const isWL = lineDrawing.abilityId === 'waylay-q'
        const segLen = isWL ? (lineDrawing.config.length ?? (15 * 7 / 1800)) : 0
        let nx = ex2, ny = ey2
        if (isWL) {
          const dxW = ex2 - lineDrawing.startX, dyW = ey2 - lineDrawing.startY
          const distW = Math.sqrt(dxW * dxW + dyW * dyW) || 1
          nx = lineDrawing.startX + (dxW / distW) * segLen
          ny = lineDrawing.startY + (dyW / distW) * segLen
        }
        multiLineRef.current.pts = [{ x: lineDrawing.startX, y: lineDrawing.startY }, { x: nx, y: ny }]
        multiLineRef.current.count = 1
        setLineDrawing(prev => prev ? { ...prev, startX: nx, startY: ny, currentX: nx, currentY: ny } : null)
      }
    }
    el.addEventListener('contextmenu', handler)
    return () => el.removeEventListener('contextmenu', handler)
  }, [lineDrawing, offsetX, offsetY, displayScale, mapW, mapH])

  return (
    <div
      ref={(node) => { containerRef.current = node }}
      data-map-drop="true"
      className={`${styles.container} ${isOver ? styles.containerOver : ''} ${toolMode === 'text' ? styles.containerText : ''}`}
      style={toolMode === 'pan' ? { cursor: 'grab' } : panning ? { cursor: 'grabbing' } : undefined}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={(e) => {
        // 右键/中键拖拽平移
        if (toolMode === 'pan') {
          e.preventDefault()
          setPanning({ sx: e.clientX, sy: e.clientY, ox: panX, oy: panY })
          return
        }
        // 选择模式：判断是否点击了绘图
        if (toolMode === 'select') {
          const t3 = transformRef.current
          if (!t3.container) return
          if ((e.target as HTMLElement).closest?.('[data-shape]')) return
          const rr = t3.container.getBoundingClientRect()
          const cx = (e.clientX - rr.left - offsetX) / (displayScale * mapW)
          const cy = (e.clientY - rr.top - offsetY) / (displayScale * mapH)
          // 命中测试绘图
          const hit = drawings.find(d => {
            switch (d.type) {
              case 'line': case 'arrow': {
                const [a, b] = d.points
                const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy
                if (len2 === 0) return Math.sqrt((cx - a.x) ** 2 + (cy - a.y) ** 2) < 0.02
                let t = ((cx - a.x) * dx + (cy - a.y) * dy) / len2
                t = Math.max(0, Math.min(1, t))
                return Math.sqrt((cx - (a.x + t * dx)) ** 2 + (cy - (a.y + t * dy)) ** 2) < 0.02
              }
              case 'freehand': {
                for (let i = 1; i < d.points.length; i++) {
                  const [a2, b2] = [d.points[i - 1], d.points[i]]
                  const dx2 = b2.x - a2.x, dy2 = b2.y - a2.y, len22 = dx2 * dx2 + dy2 * dy2
                  if (len22 === 0) continue
                  let t2 = ((cx - a2.x) * dx2 + (cy - a2.y) * dy2) / len22
                  t2 = Math.max(0, Math.min(1, t2))
                  if (Math.sqrt((cx - (a2.x + t2 * dx2)) ** 2 + (cy - (a2.y + t2 * dy2)) ** 2) < 0.02) return true
                }
                return false
              }
              default: return false
            }
          })
          if (hit) { dispatch({ type: 'SELECT', id: hit.id, selType: 'drawing' }); return }
          dispatch({ type: 'SELECT', id: null, selType: null })
          return
        }
        if (!rectDrawing || rectDrawing.drawing) return
        const t3 = transformRef.current
        if (!t3.container) return
        if ((e.target as HTMLElement).closest?.('[data-shape]')) return
        const rr = t3.container.getBoundingClientRect()
        setRectDrawing(p => p ? { ...p, drawing: true, startX: (e.clientX - rr.left - offsetX) / (displayScale * mapW), startY: (e.clientY - rr.top - offsetY) / (displayScale * mapH), currentX: (e.clientX - rr.left - offsetX) / (displayScale * mapW), currentY: (e.clientY - rr.top - offsetY) / (displayScale * mapH) } : null)
      }}
      onMouseMove={(e) => {
        if (panning) {
          const dx = e.clientX - panning.sx, dy = e.clientY - panning.sy
          const nx = panning.ox + dx, ny = panning.oy + dy
          transformRef.current.offset.x = nx
          transformRef.current.offset.y = ny
          setPanX(nx); setPanY(ny)
          return
        }
        if (!rectDrawing || !rectDrawing.drawing) return
        const rr = transformRef.current?.container?.getBoundingClientRect()
        if (!rr) return
        setRectDrawing(p => p ? { ...p, currentX: (e.clientX - rr.left - offsetX) / (displayScale * mapW), currentY: (e.clientY - rr.top - offsetY) / (displayScale * mapH) } : null)
      }}
      onMouseUp={() => {
        if (panning) { setPanning(null); return }
        if (!rectDrawing || !rectDrawing.drawing) return
        const rd = rectDrawing
        const xx = (rd.startX + rd.currentX) / 2
        const yy = (rd.startY + rd.currentY) / 2
        const ww = Math.abs(rd.currentX - rd.startX)
        const hh = Math.abs(rd.currentY - rd.startY)
        if (ww > 0.005 && hh > 0.005) {
          dispatch({ type: 'ADD_ABILITY_SHAPE', shape: {
            id: '', abilityId: rd.abilityId, agentId: rd.agentId,
            x: xx, y: yy, rotation: 0, shape: 'rect', radius: 0.08, angle: 60,
            length: ww, width: hh, thickness: 0.008, iconOnly: false,
          }})
        }
        setRectDrawing(null)
      }}
      onTouchStart={(e) => {
        const isDrawTool = toolMode === 'freehand' || toolMode === 'line' || toolMode === 'arrow' || toolMode === 'rect' || toolMode === 'circle'
        if (e.touches.length === 1) {
          if (isDrawTool) {
            const t = e.touches[0]
            const t3 = transformRef.current
            if (t3?.container) {
              const rr = t3.container.getBoundingClientRect()
              const w = { x: (t.clientX - rr.left - offsetX) / (displayScale * mapW), y: (t.clientY - rr.top - offsetY) / (displayScale * mapH) }
              setLineDrawing({ mode: 'freehand', startX: w.x, startY: w.y, currentX: w.x, currentY: w.y, abilityId: '', agentId: '', config: {} as any, path: [{ x: w.x, y: w.y }] })
            }
          } else {
            const t = e.touches[0]
            setPanning({ sx: t.clientX, sy: t.clientY, ox: panX, oy: panY })
            setPinch(null)
          }
        } else if (e.touches.length === 2) {
          const dx = e.touches[1].clientX - e.touches[0].clientX
          const dy = e.touches[1].clientY - e.touches[0].clientY
          setPinch({ dist: Math.sqrt(dx * dx + dy * dy), scale })
          setPanning(null)
        }
        // 长按检测
        if (e.touches.length === 1) {
          longPressTimer.current = setTimeout(() => {
            setLongPressMenu({ x: e.touches[0].clientX, y: e.touches[0].clientY })
          }, 600)
        }
        e.preventDefault()
      }}
      onTouchMove={(e) => {
        // 移动时取消长按
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        if (e.touches.length === 1) {
          if (lineDrawing) {
            // 更新画线
            const t = e.touches[0]
            const t3 = transformRef.current
            if (t3?.container) {
              const rr = t3.container.getBoundingClientRect()
              const w = { x: (t.clientX - rr.left - offsetX) / (displayScale * mapW), y: (t.clientY - rr.top - offsetY) / (displayScale * mapH) }
              setLineDrawing(prev => prev ? { ...prev, currentX: w.x, currentY: w.y, path: prev.mode === 'freehand' ? [...(prev.path || []), { x: w.x, y: w.y }] : prev.path } : null)
            }
          } else if (panning) {
            const t = e.touches[0]
            const dx = t.clientX - panning.sx
            const dy = t.clientY - panning.sy
            const nx = panning.ox + dx
            const ny = panning.oy + dy
            transformRef.current.offset.x = nx
            transformRef.current.offset.y = ny
            setPanX(nx); setPanY(ny)
          }
        } else if (e.touches.length === 2 && pinch) {
          const dx = e.touches[1].clientX - e.touches[0].clientX
          const dy = e.touches[1].clientY - e.touches[0].clientY
          const newDist = Math.sqrt(dx * dx + dy * dy)
          const factor = newDist / pinch.dist
          const newScale = Math.max(0.5, Math.min(3, pinch.scale * factor))
          setScale(newScale)
        }
        e.preventDefault()
      }}
      onTouchEnd={(e) => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        if (lineDrawing && e.touches.length === 0) {
          if (lineDrawing.mode === 'freehand' && (lineDrawing.path?.length || 0) > 1) {
            dispatch({
              type: 'ADD_DRAWING',
              drawing: { id: '', type: 'freehand', color: drawColor, width: 2, points: lineDrawing.path || [] },
            })
          }
          setLineDrawing(null)
        }
        if (panning) { setPanning(null) }
        if (pinch) { setPinch(null) }
        if (e.touches.length === 1 && !panning) {
          const t = e.touches[0]
          setPanning({ sx: t.clientX, sy: t.clientY, ox: panX, oy: panY })
        }
      }}
    >
      <canvas ref={canvasRef} className={styles.canvas} />

      <DrawingLayer offset={{ x: offsetX, y: offsetY }} scale={displayScale} mapW={mapW} mapH={mapH} containerRef={containerRef} />

      <div className={lineDrawing ? styles.noPointer : undefined}>
        <AbilityShapeLayer offset={{ x: offsetX, y: offsetY }} scale={displayScale} mapW={mapW} mapH={mapH} containerRef={containerRef} />
      </div>

      {/* 长按菜单 */}
      {longPressMenu && (
        <div style={{
          position: 'fixed', left: longPressMenu.x + 10, top: longPressMenu.y - 10,
          zIndex: 9999, background: '#0d0a14', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 10, padding: '6px 0', minWidth: 120,
          boxShadow: '0 4px 16px rgba(0,0,0,.5)',
        }}>
          <div style={{ padding: '6px 14px', fontSize: 11, color: 'rgba(255,255,255,.3)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>操作</div>
          <button onClick={() => { dispatch({ type: 'UNDO' }); setLongPressMenu(null) }}
            style={{ display: 'block', width: '100%', padding: '6px 14px', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            撤销
          </button>
          <button onClick={() => { setLongPressMenu(null) }}
            style={{ display: 'block', width: '100%', padding: '6px 14px', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            取消
          </button>
        </div>
      )}
      {/* 长按遮罩 */}
      {longPressMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setLongPressMenu(null)} />
      )}

      {/* 远程光标层 — Portal到body，避免transform偏移 */}
      {createPortal(
        <div ref={setCursorLayer} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />,
        document.body
      )}

            {/* 画线模式预览 */}
      {lineDrawing && (() => {
        const sx = offsetX + lineDrawing.startX * mapW * displayScale
        const sy = offsetY + lineDrawing.startY * mapH * displayScale
        const ex = offsetX + lineDrawing.currentX * mapW * displayScale
        const ey = offsetY + lineDrawing.currentY * mapH * displayScale
        const agent = agents.find(a => a.id === lineDrawing.agentId)
        const ab = agent?.abilities.find(a => a.id === lineDrawing.abilityId)
        const color = ab ? typeColors[ab.type] || '#888' : '#888'
        const sw = Math.max((lineDrawing.config.thickness ?? 0.008) * mapW * displayScale, 3)
        const isFreehand = lineDrawing.mode === 'freehand'
        const hintText = isFreehand
          ? (lineDrawing.drawing ? '拖动鼠标绘制线形 / 松手确认' : '按住鼠标开始绘制 / ESC 取消')
          : (lineDrawing.startX < 0 ? '点击放置起点 / ESC 取消' : '点击放置终点 / ESC 取消')
        return (
          <svg style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}>
            {/* 自由绘制路径预览 */}
            {isFreehand && lineDrawing.path && lineDrawing.path.length > 1 && (
              <polyline
                points={lineDrawing.path.map(p => {
                  const px = offsetX + p.x * mapW * displayScale
                  const py = offsetY + p.y * mapH * displayScale
                  return px + ',' + py
                }).join(' ')}
                fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
                opacity={0.6}
              />
            )}
            {/* 直线模式预览 */}
            {!isFreehand && (() => {
              const isFixedLen = lineDrawing.abilityId === 'neon-fast-lane' || lineDrawing.abilityId === 'neon-high-gear' || lineDrawing.abilityId === 'iso-contingency' || lineDrawing.abilityId === 'iso-undercut' || lineDrawing.abilityId === 'viper-toxic-screen' || lineDrawing.abilityId === 'iso-kill-contract' || lineDrawing.abilityId === 'waylay-q' || lineDrawing.abilityId === 'waylay-x' || lineDrawing.abilityId === 'harbor-reckoning' || lineDrawing.abilityId === 'omen-paranoia' || lineDrawing.abilityId === 'sova-hunters-fury' || lineDrawing.abilityId === 'breach-aftershock' || lineDrawing.abilityId === 'breach-fault-line' || lineDrawing.abilityId === 'breach-rolling-thunder' || lineDrawing.abilityId === 'fade-nightfall' || lineDrawing.abilityId === 'deadlock-sonic-sensor' || lineDrawing.abilityId === 'vyse-shear' || lineDrawing.abilityId === 'tejo-x' || lineDrawing.abilityId === 'miks-x'
              const previewEx = isFixedLen && lineDrawing.startX >= 0
                ? (() => {
                    const fixLenPx = (lineDrawing.config.length ?? 0.10) * mapW * displayScale
                    const dx2 = ex - sx, dy2 = ey - sy
                    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
                    return { x: sx + (dx2 / dist2) * fixLenPx, y: sy + (dy2 / dist2) * fixLenPx }
                  })()
                : { x: ex, y: ey }
              return (
                <>
                  <circle cx={sx} cy={sy} r={5} fill={color} opacity={0.8} />
                  <line x1={sx} y1={sy} x2={previewEx.x} y2={previewEx.y}
                    stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.5}
                    strokeDasharray="10 6" />
                  <circle cx={previewEx.x} cy={previewEx.y} r={5} fill="#fff" stroke={color} strokeWidth={2} opacity={0.8} />
                </>
              )
            })()}
            {/* 迷核X锥形预览 */}
            {!isFreehand && lineDrawing.abilityId === 'miks-x' && lineDrawing.startX >= 0 && (() => {
              const coneLen = (lineDrawing.config.length ?? 0.3) * mapW * displayScale
              const coneAngle = (lineDrawing.config.angle ?? 55) * Math.PI / 180
              const dir = Math.atan2(ex - sx, -(ey - sy)) - Math.PI / 2
              const leftX = sx + coneLen * Math.cos(dir - coneAngle / 2)
              const leftY = sy + coneLen * Math.sin(dir - coneAngle / 2)
              const rightX = sx + coneLen * Math.cos(dir + coneAngle / 2)
              const rightY = sy + coneLen * Math.sin(dir + coneAngle / 2)
              return (
                <path d={`M ${sx} ${sy} L ${leftX} ${leftY} A ${coneLen} ${coneLen} 0 0 1 ${rightX} ${rightY} Z`}
                  fill={color + '15'} stroke={color} strokeWidth={2} strokeDasharray="8 4" opacity={0.6} />
              )
            })()}
            {/* 起点标记（所有模式） */}
            <circle cx={sx} cy={sy} r={5} fill="#fff" stroke={color} strokeWidth={2} opacity={0.9} />
            {/* 当前鼠标位置（freehand 模式绘制中） */}
            {isFreehand && lineDrawing.drawing && (
              <circle cx={ex} cy={ey} r={4} fill={color} opacity={0.7} />
            )}
            {/* 提示文字 */}
            <text x={sx + 12} y={sy - 14} fill="#fff" fontSize={12}
              style={{ textShadow: '0 1px 3px black', pointerEvents: 'none' }}>
              {hintText}
            </text>
          </svg>
        )
      })()}

      {/* 矩形拖拽预览 */}
      {rectDrawing && rectDrawing.drawing && (() => {
        const sx2 = offsetX + Math.min(rectDrawing.startX, rectDrawing.currentX) * mapW * displayScale
        const sy2 = offsetY + Math.min(rectDrawing.startY, rectDrawing.currentY) * mapH * displayScale
        const agent2 = agents.find(a => a.id === rectDrawing.agentId)
        const ab2 = agent2?.abilities.find(a => a.id === rectDrawing.abilityId)
        const c2 = ab2 ? typeColors[ab2.type] || '#888' : '#888'
        return (
          <svg style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}>
            <rect x={sx2} y={sy2}
              width={Math.abs(rectDrawing.currentX - rectDrawing.startX) * mapW * displayScale}
              height={Math.abs(rectDrawing.currentY - rectDrawing.startY) * mapH * displayScale}
              fill={c2 + '12'} stroke={c2} strokeWidth={2} strokeDasharray="6 3" rx={2} opacity={0.7} />
          </svg>
        )
      })()}

      {/* 拖拽预览 */}
      {dragPreview && (() => {
        const px = offsetX + dragPreview.x * mapW * displayScale
        const py = offsetY + dragPreview.y * mapH * displayScale
        if (dragPreview.shape.shape === 'circle') {
          const r = (dragPreview.shape.radius ?? 0.08) * mapW * displayScale
          return (
            <svg style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
              <circle cx={px} cy={py} r={r} fill={dragPreview.color + '15'} stroke={dragPreview.color} strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />
            </svg>
          )
        }
        if (dragPreview.shape.shape === 'cone') {
          const len = (dragPreview.shape.length ?? 0.15) * mapW * displayScale
          const halfA = ((dragPreview.shape.angle ?? 60) / 2) * Math.PI / 180
          const rad = -90 * Math.PI / 180
          const x1 = px + Math.cos(rad - halfA) * len, y1 = py + Math.sin(rad - halfA) * len
          const x2 = px + Math.cos(rad + halfA) * len, y2 = py + Math.sin(rad + halfA) * len
          return (
            <svg style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
              <path d={`M ${px} ${py} L ${x1} ${y1} L ${x2} ${y2} Z`} fill={dragPreview.color + '10'} stroke={dragPreview.color} strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />
            </svg>
          )
        }
        if (dragPreview.shape.shape === 'rect') {
          const hw = (dragPreview.shape.length ?? 0.1) * mapW * displayScale / 2
          const hh = (dragPreview.shape.width ?? 0.02) * mapH * displayScale / 2
          return (
            <svg style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
              <rect x={px - hw} y={py - hh} width={hw * 2} height={hh * 2} fill={dragPreview.color + '10'} stroke={dragPreview.color} strokeWidth={2} strokeDasharray="6 3" opacity={0.6} rx={2} />
            </svg>
          )
        }
        if (dragPreview.shape.shape === 'line') {
          const hl = (dragPreview.shape.length ?? 0.1) * mapW * displayScale / 2
          const sw = (dragPreview.shape.thickness ?? 0.006) * mapW * displayScale
          return (
            <svg style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'visible' }}>
              <line x1={px} y1={py - hl} x2={px} y2={py + hl} stroke={dragPreview.color} strokeWidth={sw} strokeDasharray="6 3" opacity={0.5} />
            </svg>
          )
        }
        return null
      })()}

      {isOver && !lineDrawing && !rectDrawing && !dragPreview && <div className={styles.dropHint}>释放以放置技能</div>}


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
        const imgFile = agent ? (agentImages[agent.id] || agent.id) : ''
        return (
          <div key={ap.id}
            className={`${styles.agentPos} ${isSelected ? styles.agentPosSelected : ''}`}
            style={{
              left: offsetX + ap.x * mapW * displayScale,
              top: offsetY + ap.y * mapH * displayScale,
              borderColor: isSelected ? '#fff' : teamColor,
            }}
            onMouseDown={(e) => {
              if (toolMode === 'eraser') {
                e.stopPropagation()
                dispatch({ type: 'REMOVE_AGENT_POS', id: ap.id })
                return
              }
              handleMarkerMouseDown(e, ap.id, 'agent')
            }}
          >
            <img
              src={`/images/agents/${imgFile}.png`}
              alt={agent?.name || ''}
              className={styles.agentAvatar}
              style={{ borderColor: teamColor }}
              title={agent?.name}
            />
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

      {/* 显示全部范围 */}
      <button className={`${styles.showAllBtn} ${showAllRanges ? styles.showAllBtnActive : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_SHOW_ALL_RANGES' })}>
        👁 {showAllRanges ? '隐藏范围' : '显示全部'}
      </button>

      {/* 缩放控件 */}
      <div className={styles.controls}>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.min(3, s * 1.25))}>+</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button className={styles.zoomBtn} onClick={() => setScale(s => Math.max(0.5, s * 0.8))}>−</button>
        <button className={styles.zoomBtn} onClick={() => setScale(1)}>1:1</button>
        <div className={styles.controlsDivider} />
        <button className={styles.zoomBtn} onClick={() => setMapRotation(r => (r + 90) % 360)} data-tooltip="旋转地图">↻</button>
      </div>

      {/* 观察者模式横幅 */}
      {roomEditorId && !isRoomEditor && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: 'rgba(255,70,85,.85)', color: '#fff', padding: '4px 16px', borderRadius: 20,
          fontSize: 12, fontWeight: 600, letterSpacing: '.5px',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.15)',
        }}>
          🔒 观察模式 — 仅编辑者可操作
        </div>
      )}

      {/* 底部状态栏 */}
      <div className={styles.statusBar}>
        <div className={styles.statusEq}>
          <span /><span /><span /><span />
        </div>
        <span>就绪 · {_mapName} · {side === 'attack' ? '进攻方' : '防守方'}{roomEditorId && !isRoomEditor ? ' · 观察中' : ''}</span>
        <div className={styles.statusDot} style={{ background: roomEditorId && !isRoomEditor ? '#f0c850' : undefined }} />
        <span>{roomEditorId && !isRoomEditor ? '观察者' : '在线'}</span>
      </div>

      {/* 地图切换过渡遮罩 */}
      <div className={`${styles.mapTransition} ${!mapSwitching ? styles.mapTransitionOut : ''}`} />
    </div>
  )
}
