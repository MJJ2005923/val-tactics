import { useState, useRef, useCallback } from 'react'
import { useTactics } from '../../store/TacticsContext'
import type { DrawPath } from '../../types'

// 点到线段的距离
function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.sqrt((p.x - (a.x + t * dx)) ** 2 + (p.y - (a.y + t * dy)) ** 2)
}

interface Props {
  offset: { x: number; y: number }
  scale: number
  mapW: number
  mapH: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function DrawingLayer({ offset, scale, mapW, mapH, containerRef }: Props) {
  const { drawings, toolMode, drawColor, drawWidth, selectedId, selectedType, dispatch } = useTactics()
  const [preview, setPreview] = useState<DrawPath | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const drawingRef = useRef(false)

  // 命中检测：判断点击是否在绘图附近
  const hitTest = (d: DrawPath, p: { x: number; y: number }): boolean => {
    const threshold = 0.02 // 点击容差
    switch (d.type) {
      case 'line': case 'arrow': {
        const [a, b] = d.points
        return distToSegment(p, a, b) < threshold
      }
      case 'rect': {
        if (d.w === undefined || d.h === undefined || d.x === undefined || d.y === undefined) return false
        const rx = Math.min(d.x, d.x + d.w), ry = Math.min(d.y, d.y + d.h)
        const rw = Math.abs(d.w), rh = Math.abs(d.h)
        return p.x >= rx - threshold && p.x <= rx + rw + threshold && p.y >= ry - threshold && p.y <= ry + rh + threshold
      }
      case 'circle': {
        if (!d.cx || !d.cy || !d.r) return false
        const dist = Math.sqrt((p.x - d.cx) ** 2 + (p.y - d.cy) ** 2)
        return dist < d.r + threshold
      }
      case 'freehand': {
        for (let i = 1; i < d.points.length; i++) {
          if (distToSegment(p, d.points[i - 1], d.points[i]) < threshold) return true
        }
        return false
      }
      default: return false
    }
  }

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (sx - rect.left - offset.x) / scale / mapW,
      y: (sy - rect.top - offset.y) / scale / mapH
    }
  }, [offset, scale, mapW, mapH, containerRef])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 橡皮擦模式：检测点击是否命中绘图
    if (toolMode === 'eraser') {
      const p = screenToWorld(e.clientX, e.clientY)
      const hit = drawings.find(d => hitTest(d, p))
      if (hit) { dispatch({ type: 'REMOVE_DRAWING', id: hit.id }); return }
      // 如果没命中绘图，穿透到下方让 AbilityShapeLayer 处理技能形状
      return
    }
    if (toolMode === 'select') {
      const p = screenToWorld(e.clientX, e.clientY)
      const hit = drawings.find(d => hitTest(d, p))
      if (hit) { dispatch({ type: 'SELECT', id: hit.id, selType: 'drawing' }); return }
      dispatch({ type: 'SELECT', id: null, selType: null })
      return
    }
    if (toolMode === 'text' || toolMode === 'agent') return
    e.stopPropagation()
    drawingRef.current = true
    const p = screenToWorld(e.clientX, e.clientY)
    if (toolMode === 'freehand') {
      setPreview({ id: '', type: 'freehand', points: [p], color: drawColor, width: drawWidth })
    } else if (toolMode === 'line' || toolMode === 'arrow') {
      setPreview({ id: '', type: toolMode, points: [p, p], color: drawColor, width: drawWidth })
    } else if (toolMode === 'rect') {
      setPreview({ id: '', type: 'rect', points: [p], color: drawColor, width: drawWidth, x: p.x, y: p.y, w: 0, h: 0 })
    } else if (toolMode === 'circle') {
      setPreview({ id: '', type: 'circle', points: [p], color: drawColor, width: drawWidth, cx: p.x, cy: p.y, r: 0 })
    }
  }, [toolMode, drawColor, drawWidth, drawings, screenToWorld])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const p = screenToWorld(e.clientX, e.clientY)
    setCursorPos(p)
    if (!drawingRef.current) return
    setPreview(d => {
      if (!d) return null
      if (d.type === 'freehand') return { ...d, points: [...d.points, p] }
      if (d.type === 'line' || d.type === 'arrow') return { ...d, points: [d.points[0], p] }
      if (d.type === 'rect') return { ...d, w: p.x - d.points[0].x, h: p.y - d.points[0].y }
      if (d.type === 'circle') {
        const dx = p.x - d.cx!, dy = p.y - d.cy!
        return { ...d, r: Math.sqrt(dx * dx + dy * dy) }
      }
      return d
    })
  }, [screenToWorld])

  const handleMouseUp = useCallback(() => {
    if (!drawingRef.current) return
    drawingRef.current = false
    setPreview(d => {
      if (!d) return null
      if (d.type === 'freehand' && d.points.length < 2) return null
      if ((d.type === 'line' || d.type === 'arrow') && Math.abs(d.points[1].x - d.points[0].x) < 0.002 && Math.abs(d.points[1].y - d.points[0].y) < 0.002) return null
      if (d.type === 'rect' && (!d.w || Math.abs(d.w!) < 0.003) && (!d.h || Math.abs(d.h!) < 0.003)) return null
      if (d.type === 'circle' && (!d.r || d.r < 0.003)) return null
      dispatch({ type: 'ADD_DRAWING', drawing: { ...d, id: '' } })
      return null
    })
  }, [dispatch])

  const renderPath = (d: DrawPath, preview = false) => {
    const scaledStroke = d.width / scale
    const dash = preview ? '6 4' : undefined
    const dashOpacity = preview ? 0.6 : undefined
    switch (d.type) {
      case 'freehand': {
        if (d.points.length < 2) return null
        let dAttr = `M ${d.points[0].x * mapW} ${d.points[0].y * mapH}`
        for (let i = 1; i < d.points.length; i++) {
          dAttr += ` L ${d.points[i].x * mapW} ${d.points[i].y * mapH}`
        }
        return <path key={d.id} d={dAttr} stroke={d.color} strokeWidth={scaledStroke} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} opacity={dashOpacity} />
      }
      case 'line': {
        const [a, b] = d.points
        const midX = (a.x + b.x) / 2 * mapW
        return (
          <g key={d.id}>
            <line x1={a.x * mapW} y1={a.y * mapH} x2={b.x * mapW} y2={b.y * mapH} stroke={d.color} strokeWidth={scaledStroke} strokeLinecap="round" strokeDasharray={dash} opacity={dashOpacity} />
            {!preview && d.id === selectedId && selectedType === 'drawing' && (
              <text x={midX} y={(a.y + b.y) / 2 * mapH - 8} textAnchor="middle" fill="#fff" fontSize={12 / scale} fontWeight={600}
                style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(0,0,0,.7)', strokeWidth: 3 / scale, strokeLinecap: 'round' }}>
                {Math.round(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) / (7 / 1600))}m
              </text>
            )}
          </g>
        )
      }
      case 'arrow': {
        const [a, b] = d.points
        const markerId = `arrowhead-${d.id}${preview ? '-p' : ''}`
        const midX = (a.x + b.x) / 2 * mapW
        return (
          <g key={d.id} opacity={dashOpacity}>
            <defs>
              <marker id={markerId} markerWidth={7} markerHeight={5} refX={3} refY={2.5} orient="auto">
                <polygon points={`0,0 6,2.5 0,5`} fill={d.color} />
              </marker>
            </defs>
            <line x1={a.x * mapW} y1={a.y * mapH} x2={b.x * mapW} y2={b.y * mapH} stroke={d.color} strokeWidth={scaledStroke} markerEnd={`url(#${markerId})`} strokeLinecap="round" strokeDasharray={dash} />
            {!preview && d.id === selectedId && selectedType === 'drawing' && (
              <text x={midX} y={(a.y + b.y) / 2 * mapH - 8} textAnchor="middle" fill="#fff" fontSize={12 / scale} fontWeight={600}
                style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(0,0,0,.7)', strokeWidth: 3 / scale, strokeLinecap: 'round' }}>
                {Math.round(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) / (7 / 1600))}m
              </text>
            )}
          </g>
        )
      }
      case 'rect': {
        const x = Math.min(d.x!, d.x! + d.w!) * mapW
        const y = Math.min(d.y!, d.y! + d.h!) * mapH
        const w = Math.abs(d.w!) * mapW
        const h = Math.abs(d.h!) * mapH
        return <rect key={d.id} x={x} y={y} width={w} height={h} stroke={d.color} strokeWidth={scaledStroke} fill={`${d.color}15`} strokeDasharray={dash} opacity={dashOpacity} />
      }
      case 'circle': {
        return <circle key={d.id} cx={d.cx! * mapW} cy={d.cy! * mapH} r={d.r! * mapW} stroke={d.color} strokeWidth={scaledStroke} fill={`${d.color}15`} strokeDasharray={dash} opacity={dashOpacity} />
      }
      default:
        return null
    }
  }

  const isDrawing = toolMode === 'freehand' || toolMode === 'line' || toolMode === 'arrow' || toolMode === 'rect' || toolMode === 'circle'
  const isEraser = toolMode === 'eraser'
  const isSelect = toolMode === 'select'
  const svgActive = isDrawing || isEraser || isSelect

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: isEraser ? 1 : 3,
        cursor: isEraser ? 'pointer' : isDrawing ? 'crosshair' : undefined,
        pointerEvents: svgActive ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
        {drawings.map(d => renderPath(d))}
        {/* 正在绘制的预览 — 虚线+半透明 */}
        {preview && renderPath(preview, true)}
        {/* 光标指示器 — 显示当前颜色和粗细 */}
        {cursorPos && isDrawing && !drawingRef.current && (
          <circle cx={cursorPos.x * mapW} cy={cursorPos.y * mapH}
            r={drawWidth * 2 / scale}
            fill={`${drawColor}30`} stroke={drawColor} strokeWidth={1.5 / scale}
            style={{ pointerEvents: 'none' }} />
        )}
      </g>
    </svg>
  )
}
