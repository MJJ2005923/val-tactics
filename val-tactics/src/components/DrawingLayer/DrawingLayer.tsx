import { useState, useRef, useCallback } from 'react'
import { useTactics } from '../../store/TacticsContext'
import type { DrawPath } from '../../types'

interface Props {
  offset: { x: number; y: number }
  scale: number
  mapW: number
  mapH: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export default function DrawingLayer({ offset, scale, mapW, mapH, containerRef }: Props) {
  const { drawings, toolMode, drawColor, drawWidth, dispatch } = useTactics()
  const [preview, setPreview] = useState<DrawPath | null>(null)
  const drawingRef = useRef(false)

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (sx - rect.left - offset.x) / scale / mapW,
      y: (sy - rect.top - offset.y) / scale / mapH
    }
  }, [offset, scale, mapW, mapH, containerRef])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'select' || toolMode === 'text' || toolMode === 'agent' || toolMode === 'eraser') return
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
  }, [toolMode, drawColor, drawWidth, screenToWorld])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawingRef.current) return
    const p = screenToWorld(e.clientX, e.clientY)
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
        return <line key={d.id} x1={a.x * mapW} y1={a.y * mapH} x2={b.x * mapW} y2={b.y * mapH} stroke={d.color} strokeWidth={scaledStroke} strokeLinecap="round" strokeDasharray={dash} opacity={dashOpacity} />
      }
      case 'arrow': {
        const [a, b] = d.points
        const markerId = `arrowhead-${d.id}${preview ? '-p' : ''}`
        return (
          <g key={d.id} opacity={dashOpacity}>
            <defs>
              <marker id={markerId} markerWidth={7} markerHeight={5} refX={3} refY={2.5} orient="auto">
                <polygon points={`0,0 6,2.5 0,5`} fill={d.color} />
              </marker>
            </defs>
            <line x1={a.x * mapW} y1={a.y * mapH} x2={b.x * mapW} y2={b.y * mapH} stroke={d.color} strokeWidth={scaledStroke} markerEnd={`url(#${markerId})`} strokeLinecap="round" strokeDasharray={dash} />
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

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: 3,
        cursor: isDrawing ? 'crosshair' : undefined,
        pointerEvents: isDrawing ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
        {drawings.map(d => renderPath(d))}
        {/* 正在绘制的预览 — 虚线+半透明 */}
        {preview && renderPath(preview, true)}
      </g>
    </svg>
  )
}
