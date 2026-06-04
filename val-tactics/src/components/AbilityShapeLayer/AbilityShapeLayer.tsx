import { useRef, useCallback, useEffect } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import type { AbilityShape } from '../../types'
import styles from './AbilityShapeLayer.module.css'

// 海神X波浪 — 直接用ref+RAF避免React重渲染
function HarborWave({ pathPts, color, mapW, mapH, scale, svgCenterX, svgCenterY, svgHalfW, svgHalfH }: {
  pathPts: { x: number; y: number }[]; color: string
  mapW: number; mapH: number; scale: number
  svgCenterX: number; svgCenterY: number; svgHalfW: number; svgHalfH: number
}) {
  const lineRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    if (pathPts.length < 2) return
    // 预计算SVG路径点
    const pts = pathPts.map(p => ({
      x: svgHalfW + (p.x - svgCenterX) * mapW * scale,
      y: svgHalfH + (p.y - svgCenterY) * mapH * scale,
    }))
    const segLens: number[] = []
    for (let i = 1; i < pts.length; i++) {
      segLens.push(Math.sqrt((pts[i].x - pts[i-1].x) ** 2 + (pts[i].y - pts[i-1].y) ** 2))
    }
    const totalLen = segLens.reduce((a, b) => a + b, 0)
    if (totalLen === 0) return

    let t = 0
    let rafId: number
    const animate = () => {
      t += 0.004
      if (t >= 1) return // 停在终点
      const target = t * totalLen
      let acc = 0, segIdx = 0
      for (let i = 0; i < segLens.length; i++) {
        if (acc + segLens[i] >= target) { segIdx = i; break }
        acc += segLens[i]
      }
      const segFrac = segLens[segIdx] > 0 ? (target - acc) / segLens[segIdx] : 0
      const a = pts[segIdx], b = pts[segIdx + 1]
      const x = a.x + (b.x - a.x) * segFrac
      const y = a.y + (b.y - a.y) * segFrac
      const dx2 = b.x - a.x, dy2 = b.y - a.y
      const n = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
      const pw = 45 * scale
      const px = -dy2 / n * pw, py = dx2 / n * pw
      if (lineRef.current) {
        lineRef.current.setAttribute('x1', String(x - px))
        lineRef.current.setAttribute('y1', String(y - py))
        lineRef.current.setAttribute('x2', String(x + px))
        lineRef.current.setAttribute('y2', String(y + py))
      }
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [pathPts, svgHalfW, svgHalfH, svgCenterX, svgCenterY, mapW, mapH, scale])

  return <line ref={lineRef} stroke={color} strokeWidth={4} opacity={0.7}
    strokeLinecap="round" style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 8px ${color})` }} />
}

interface Props {
  offset: { x: number; y: number }
  scale: number
  mapW: number
  mapH: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

const typeColors: Record<string, string> = {
  smoke: '#7ec868', flash: '#f0c850', damage: '#ff4655',
  recon: '#50b4f0', control: '#a070d8', heal: '#50e890', mobility: '#ff8c42'
}

// 每种技能类型的独特视觉效果
const typeStyles: Record<string, { gradient: string }> = {
  smoke: {
    gradient: 'radial-gradient(circle at 40% 40%, rgba(126,200,104,0.35), rgba(126,200,104,0.12) 50%, rgba(126,200,104,0.04) 80%, rgba(126,200,104,0.01) 100%)',
  },
  flash: {
    gradient: 'conic-gradient(from 0deg, rgba(240,200,80,0.3), rgba(240,200,80,0.05) 30deg, rgba(240,200,80,0.3) 60deg, rgba(240,200,80,0.05) 90deg, rgba(240,200,80,0.3) 120deg)',
  },
  damage: {
    gradient: 'radial-gradient(circle, rgba(255,70,85,0.45), rgba(255,70,85,0.18) 40%, rgba(255,70,85,0.04) 75%, transparent)',
  },
  recon: {
    gradient: 'radial-gradient(circle at 30% 30%, rgba(80,180,240,0.3), rgba(80,180,240,0.1) 60%, rgba(80,180,240,0.02) 100%)',
  },
  control: {
    gradient: `repeating-linear-gradient(0deg, rgba(160,112,216,0.15) 0px, rgba(160,112,216,0.15) 2px, transparent 2px, transparent 4px),
               repeating-linear-gradient(90deg, rgba(160,112,216,0.15) 0px, rgba(160,112,216,0.15) 2px, transparent 2px, transparent 4px)`,
  },
  heal: {
    gradient: 'radial-gradient(circle, rgba(80,232,144,0.4), rgba(80,232,144,0.15) 50%, rgba(80,232,144,0.03) 100%)',
  },
  mobility: {
    gradient: 'repeating-linear-gradient(90deg, rgba(255,140,66,0.3) 0px, rgba(255,140,66,0.3) 6px, transparent 6px, transparent 10px)',
  },
}

interface AbilityInfo { color: string; key: string; name: string; type: string; gradient: string; iconUrl: string; iconFilter?: string }

// 特定技能图标染色
const iconTints: Record<string, string> = {
  'reyna-leer': 'sepia(1) saturate(3) hue-rotate(240deg) brightness(1.1)', // 紫色
  'yoru-fakeout': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'yoru-gatecrash': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'yoru-dimensional-drift': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'viper-snake-bite': 'sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1)', // 绿色
  'viper-poison-cloud': 'sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1)', // 绿色
  'viper-toxic-screen': 'sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1)', // 绿色
  'viper-pit': 'sepia(1) saturate(3) hue-rotate(80deg) brightness(1.1)', // 绿色
  'omen-shrouded-step': 'sepia(1) saturate(3) hue-rotate(240deg) brightness(1.1)', // 紫色
  'omen-paranoia': 'sepia(1) saturate(3) hue-rotate(240deg) brightness(1.1)', // 紫色
  'omen-dark-cover': 'sepia(1) saturate(3) hue-rotate(240deg) brightness(1.1)', // 紫色
  'omen-from-the-shadows': 'sepia(1) saturate(3) hue-rotate(240deg) brightness(1.1)', // 紫色
  'harbor-cascade': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'harbor-high-tide': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'harbor-cove': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'harbor-reckoning': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sova-owl-drone': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sova-shock-bolt': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
}

// 特定技能形状颜色覆盖（标签不变，仅视觉变色）
const colorOverrides: Record<string, string> = {
  'phoenix-blaze': '#f0c850', // 火冒三丈 → 黄色
  'sova-recon-bolt': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sova-hunters-fury': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sage-barrier-orb': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sage-slow-orb': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sage-healing-orb': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'sage-resurrection': 'sepia(1) saturate(3) hue-rotate(180deg) brightness(1.1)', // 蓝色
  'jett-cloudburst': 'brightness(0) invert(1)', // 白色
  'jett-updraft': 'brightness(0) invert(1)', // 白色
  'jett-tailwind': 'brightness(0) invert(1)', // 白色
  'jett-blade-storm': 'brightness(0) invert(1)', // 白色
}

function getAbilityInfo(shape: AbilityShape): AbilityInfo {
  const agent = agents.find(a => a.id === shape.agentId)
  const ab = agent?.abilities.find(a => a.id === shape.abilityId)
  const type = ab?.type || 'smoke'
  const isJett = shape.agentId === 'jett'
  const isSage = shape.agentId === 'sage'
  const ts = typeStyles[type]
  const svgColor = colorOverrides[shape.abilityId] || typeColors[type] || '#888'
  const overrideColor = isJett ? '#ffffff' : isSage ? '#50b4f0' : undefined
  return {
    color: overrideColor || svgColor,
    key: ab?.key || '',
    name: ab?.name || '',
    type,
    gradient: overrideColor ? '' : (ts?.gradient || ''),
    iconUrl: ab?.iconUrl || '',
    iconFilter: iconTints[shape.abilityId],
  }
}

function degToRad(d: number) { return (d * Math.PI) / 180 }

interface DragState {
  shapeId: string
  mode: 'move' | 'rotate'
  startMouse: { x: number; y: number }
  startShape: AbilityShape
}

export default function AbilityShapeLayer({ offset, scale, mapW, mapH, containerRef }: Props) {
  const { abilityShapes, selectedId, selectedType, toolMode, replaying, revealedShapeIds, animatingShapeId, dispatch } = useTactics()
  const dragRef = useRef<DragState | null>(null)

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (sx - rect.left - offset.x) / scale / mapW,
      y: (sy - rect.top - offset.y) / scale / mapH
    }
  }, [offset, scale, mapW, mapH, containerRef])

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const world = screenToWorld(e.clientX, e.clientY)
      const startWorld = screenToWorld(d.startMouse.x, d.startMouse.y)
      const dx = world.x - startWorld.x
      const dy = world.y - startWorld.y
      if (d.mode === 'move') {
        if (d.startShape.path && d.startShape.path.length > 1) {
          const newPath = d.startShape.path.map(p => ({ x: p.x + dx, y: p.y + dy }))
          let sx4 = 0, sy4 = 0
          for (const p of newPath) { sx4 += p.x; sy4 += p.y }
          dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: d.shapeId, updates: { path: newPath, x: sx4 / newPath.length, y: sy4 / newPath.length } })
        } else {
          dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: d.shapeId, updates: { x: d.startShape.x + dx, y: d.startShape.y + dy } })
        }
      } else if (d.mode === 'rotate') {
        const cx = d.startShape.x, cy = d.startShape.y
        const sa = Math.atan2(startWorld.x - cx, -(startWorld.y - cy))
        const ea = Math.atan2(world.x - cx, -(world.y - cy))
        dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: d.shapeId, updates: { rotation: (d.startShape.rotation + ((ea - sa) * 180) / Math.PI) % 360 } })
      }
    }
    const up = () => { dragRef.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [dispatch, screenToWorld])

  const handleMouseDown = useCallback((e: React.MouseEvent, shape: AbilityShape) => {
    e.stopPropagation()
    if (toolMode === 'eraser') {
      dispatch({ type: 'REMOVE_ABILITY_SHAPE', id: shape.id })
      return
    }
    dispatch({ type: 'SELECT', id: shape.id, selType: 'abilityShape' })
    dragRef.current = { shapeId: shape.id, mode: 'move', startMouse: { x: e.clientX, y: e.clientY }, startShape: { ...shape } }
  }, [dispatch, toolMode])

  const handleRotMouseDown = useCallback((e: React.MouseEvent, shape: AbilityShape) => {
    e.stopPropagation()
    dragRef.current = { shapeId: shape.id, mode: 'rotate', startMouse: { x: e.clientX, y: e.clientY }, startShape: { ...shape } }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* SVG 图案定义 */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          {/* 侦查扫描弧线 */}
          <pattern id="recon-scan" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(80,180,240,0.2)" strokeWidth="1" />
            <circle cx="10" cy="10" r="4" fill="none" stroke="rgba(80,180,240,0.15)" strokeWidth="0.5" />
          </pattern>
          {/* 烟雾涡流 */}
          <pattern id="smoke-swirl" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(126,200,104,0.15)" strokeWidth="1" strokeDasharray="3 4" />
          </pattern>
          {/* 控制网格 */}
          <pattern id="control-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="1" fill="rgba(160,112,216,0.25)" />
          </pattern>
          {/* 治疗十字 */}
          <pattern id="heal-cross" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect x="10" y="4" width="4" height="16" fill="rgba(80,232,144,0.15)" rx="1" />
            <rect x="4" y="10" width="16" height="4" fill="rgba(80,232,144,0.15)" rx="1" />
          </pattern>
          {/* 移动箭头 */}
          <marker id="arrow-m" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,140,66,0.6)" />
          </marker>
          {/* 闪光射线 */}
          <pattern id="flash-rays" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="8" x2="16" y2="8" stroke="rgba(240,200,80,0.18)" strokeWidth="1" />
            <line x1="8" y1="0" x2="8" y2="16" stroke="rgba(240,200,80,0.1)" strokeWidth="0.5" />
          </pattern>
        </defs>
      </svg>

      {abilityShapes.filter(s => !replaying || revealedShapeIds.includes(s.id)).map(s => {
        const isSelected = s.id === selectedId && selectedType === 'abilityShape'
        const isAnimating = animatingShapeId === s.id
        const info = getAbilityInfo(s)
        const { color } = info

        const cx = offset.x + s.x * mapW * scale
        const cy = offset.y + s.y * mapH * scale

        // 仅图标模式：不渲染形状，只显示图标
        if (s.iconOnly) {
          return (
            <div key={s.id} className={isAnimating ? styles.shapeReveal : undefined} style={{ position: 'absolute', pointerEvents: 'auto' }}>
              <div style={{ position: 'absolute', left: cx - 14, top: cy - 14, pointerEvents: 'none' }}>
                <img src={info.iconUrl} style={{ width: 28, height: 28,
                  filter: info.iconFilter
                    ? `drop-shadow(0 1px 3px rgba(0,0,0,0.6)) ${info.iconFilter}`
                    : 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div style={{ position: 'absolute', left: cx - 4, top: cy - 4, width: 8, height: 8, borderRadius: '50%', background: color, cursor: 'move' }}
                onMouseDown={(e) => handleMouseDown(e, s)} />
              {isSelected && (
                <div style={{ position: 'absolute', left: cx - 4, top: cy - 16, width: 8, height: 8, borderRadius: '50%', background: '#fff', border: '1px solid #333', cursor: 'grab' }}
                  onMouseDown={(e) => handleRotMouseDown(e, s)} />
              )}
            </div>
          )
        }

        if (s.shape === 'circle') {
          const r = Math.max(s.radius * mapW * scale, 6)
          const t = info.type
          // Deadlock C 十字形
          if (s.abilityId === 'deadlock-gravnet') {
            const armW2 = Math.max(r * 0.15, 4)
            const armLen2 = r * 1.5
            return (
              <div key={s.id} data-shape={s.id} className={isAnimating ? styles.shapeReveal : undefined} style={{ position: 'absolute', pointerEvents: 'auto', transform: `rotate(${s.rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
                {[[0, -armLen2], [0, armLen2], [-armLen2, 0], [armLen2, 0]].map(([ox, oy], i) => (
                  <span key={i}>
                    <div style={{ position: 'absolute', left: cx + (ox > 0 ? 0 : ox) - (ox ? 0 : armW2), top: cy + (oy > 0 ? 0 : oy) - (oy ? 0 : armW2), width: ox ? armLen2 : armW2 * 2, height: oy ? armLen2 : armW2 * 2, background: color + '60', borderRadius: armW2, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', left: cx + ox - armW2 * 1.5, top: cy + oy - armW2 * 1.5, width: armW2 * 3, height: armW2 * 3, borderRadius: '50%', background: color + '80', border: '1px solid ' + color, pointerEvents: 'none' }} />
                  </span>
                ))}
                <div style={{ position: 'absolute', left: cx - 8, top: cy - 8, width: 16, height: 16, borderRadius: '50%', cursor: 'move', background: 'transparent', border: isSelected ? '2px solid #fff' : 'none' }} onMouseDown={(e) => handleMouseDown(e, s)} />
                <img src={info.iconUrl} style={{ position: 'absolute', left: cx-10, top: cy-10, width: 20, height: 20, filter: 'drop-shadow(0 1px 3px black)', pointerEvents: 'none' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                {isSelected && (<div style={{ position: 'absolute', left: cx-6, top: cy-r-20, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #333', cursor: 'grab', boxShadow: '0 0 6px black' }} onMouseDown={(e) => handleRotMouseDown(e, s)} />)}
              </div>
            )
          }
          // Raze E 大圆+4小圆
          if (s.abilityId === 'raze-paint-shells') {
            const sr = Math.max(r * 0.22, 5)
            const dirs = [[0, -r*0.85], [0, r*0.85], [-r*0.85, 0], [r*0.85, 0]]
            return (
              <div key={s.id} data-shape={s.id} className={isAnimating ? styles.shapeReveal : undefined} style={{ position: 'absolute', pointerEvents: 'auto' }}>
                {dirs.map(([ox, oy], i) => (
                  <div key={i} style={{ position: 'absolute', left: cx + ox - sr, top: cy + oy - sr,
                    width: sr*2, height: sr*2, borderRadius: '50%',
                    border: '2px solid ' + color + '80', background: color + '25',
                    pointerEvents: 'none' }} />
                ))}
                <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r*2, height: r*2,
                  borderRadius: '50%', cursor: 'move',
                  border: '2px solid ' + (isSelected ? '#fff' : color) + '90',
                  background: 'radial-gradient(circle, ' + color + '25 0%, ' + color + '10 60%, transparent 100%)',
                  boxShadow: isSelected ? '0 0 14px ' + color + '80' : '0 0 4px ' + color + '20',
                }} onMouseDown={(e) => handleMouseDown(e, s)} />
                <img src={info.iconUrl} style={{ position: 'absolute', left: cx-16, top: cy-16,
                  width: 32, height: 32, filter: 'drop-shadow(0 1px 3px black)', pointerEvents: 'none' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                {isSelected && (
                  <div style={{ position: 'absolute', left: cx-6, top: cy-r-20, width: 12, height: 12,
                    borderRadius: '50%', background: '#fff', border: '2px solid #333', cursor: 'grab',
                    boxShadow: '0 0 6px black' }} onMouseDown={(e) => handleRotMouseDown(e, s)} />
                )}
              </div>
            )
          }
          return (
            <div key={s.id} data-shape={s.id} className={isAnimating ? styles.shapeReveal : undefined} style={{ position: 'absolute', pointerEvents: 'auto' }}>
              {t === 'smoke' && (
                <>
                  <div style={{ position: 'absolute', left: cx - r*1.3, top: cy - r*1.3, width: r*2.6, height: r*2.6,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,200,180,0.15) 0%, rgba(160,180,160,0.06) 40%, transparent 70%)',
                    filter: 'blur(12px)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: cx - r*0.8, top: cy - r*0.6, width: r*1.6, height: r*1.6,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,220,200,0.2) 0%, rgba(180,200,180,0.08) 50%, transparent 75%)',
                    filter: 'blur(6px)', pointerEvents: 'none' }} />
                </>
              )}
              {t === 'damage' && (
                <>
                  <div style={{ position: 'absolute', left: cx - r*0.45, top: cy - r*0.45, width: r*0.9, height: r*0.9,
                    borderRadius: '50%', background: `radial-gradient(circle, ${color}80 0%, ${color}40 30%, transparent 65%)`,
                    filter: 'blur(3px)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: cx - r*0.25, top: cy - r*0.3, width: r*0.5, height: r*0.5,
                    borderRadius: '50%', background: `radial-gradient(circle, #fff8 0%, ${color}60 50%, transparent 100%)`,
                    filter: 'blur(1px)', pointerEvents: 'none' }} />
                </>
              )}
              {t === 'heal' && (
                <>
                  <div style={{ position: 'absolute', left: cx - r*0.1, top: cy - r*0.55, width: r*0.2, height: r*1.1,
                    background: `linear-gradient(0deg, transparent, ${color}40 30%, ${color}60 50%, ${color}40 70%, transparent)`,
                    borderRadius: r*0.1, pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: cx - r*0.55, top: cy - r*0.1, width: r*1.1, height: r*0.2,
                    background: `linear-gradient(90deg, transparent, ${color}40 30%, ${color}60 50%, ${color}40 70%, transparent)`,
                    borderRadius: r*0.1, pointerEvents: 'none' }} />
                </>
              )}
              {t === 'control' && (
                <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r*2, height: r*2,
                  borderRadius: '50%',
                  background: `conic-gradient(from 0deg, ${color}15 0deg, ${color}05 45deg, ${color}12 90deg, ${color}03 135deg, ${color}10 180deg, ${color}05 225deg, ${color}08 270deg, ${color}04 315deg, ${color}15 360deg)`,
                  pointerEvents: 'none' }} />
              )}
              <div style={{
                position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2,
                borderRadius: '50%', cursor: 'move',
                border: `2px solid ${isSelected ? '#fff' : color}${t === 'smoke' ? '40' : '80'}`,
                background: t === 'smoke'
                  ? `radial-gradient(circle at 35% 35%, rgba(210,220,210,0.3) 0%, rgba(180,200,180,0.12) 40%, rgba(150,170,160,0.04) 70%, transparent 100%)`
                  : t === 'damage'
                  ? `radial-gradient(circle, ${color}35 0%, ${color}15 40%, ${color}05 70%, transparent 100%)`
                  : t === 'heal'
                  ? `radial-gradient(circle, ${color}25 0%, ${color}10 50%, ${color}03 80%, transparent 100%)`
                  : `radial-gradient(circle, ${color}20, ${color}08 60%, ${color}02 100%)`,
                boxShadow: isSelected ? `0 0 14px ${color}, 0 0 4px #fff`
                  : t === 'damage' ? `0 0 10px ${color}50, inset 0 0 6px ${color}20`
                  : `0 0 3px ${color}20`,
              }}
                onMouseDown={(e) => handleMouseDown(e, s)}
              />
              <div style={{ position: 'absolute', left: cx - 14, top: cy - 14, pointerEvents: 'none' }}>
                <img src={info.iconUrl} style={{ width: 28, height: 28,
                  filter: info.iconFilter
                    ? `drop-shadow(0 1px 3px rgba(0,0,0,0.6)) ${info.iconFilter}`
                    : 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              {/* 夜露C技能方向箭头（圆形外围） */}
              {(s.abilityId === 'yoru-fakeout' || s.abilityId === 'raze-boom-bot') && (
                <div style={{
                  position: 'absolute', left: cx - 5, top: cy - r - 14, width: 10, height: 18,
                  pointerEvents: 'none', transformOrigin: `5px ${r + 14}px`,
                  transform: `rotate(${s.rotation}deg)`,
                }}>
                  <div style={{
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                    borderBottom: `12px solid ${color}`,
                    margin: '0 auto',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
                  }} />
                </div>
              )}
              {isSelected && (
                <>
                  <div style={{ position: 'absolute', left: cx - 1, top: cy - r - 8, width: 2, height: 16, background: '#fff' }} />
                  <div style={{ position: 'absolute', left: cx - 6, top: cy - r - 22, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #333', cursor: 'grab', boxShadow: '0 0 6px black' }}
                    onMouseDown={(e) => handleRotMouseDown(e, s)} />
                </>
              )}
            </div>
          )
        }

        if (s.shape === 'rect') {
          const hw = (s.length * mapW * scale) / 2
          const hh = (s.width * mapH * scale) / 2
          return (
            <div key={s.id} data-shape={s.id} className={isAnimating ? styles.shapeReveal : undefined} style={{ position: 'absolute', pointerEvents: 'auto' }}>
              <div style={{
                position: 'absolute', left: cx - hw, top: cy - hh, width: hw * 2, height: hh * 2,
                border: `2px solid ${isSelected ? '#fff' : color}90`, borderRadius: 2,
                background: `repeating-linear-gradient(0deg, ${color}10 0px, ${color}10 2px, ${color}05 2px, ${color}05 4px),
                            repeating-linear-gradient(90deg, ${color}08 0px, ${color}08 2px, ${color}03 2px, ${color}03 4px)`,
                cursor: 'move', transform: `rotate(${s.rotation}deg)`,
                boxShadow: isSelected ? `0 0 16px ${color}80, 0 0 4px ${color}` : `0 0 4px ${color}20`,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
                onMouseDown={(e) => handleMouseDown(e, s)}
              />
              <div style={{
                position: 'absolute', left: cx - 16, top: cy - 16,
                pointerEvents: 'none',
              }}>
                <img src={info.iconUrl}
                  style={{ width: 28, height: 28, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              {isSelected && (
                <div style={{ position: 'absolute', left: cx - 6, top: cy - hh - 26, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #333', cursor: 'grab', boxShadow: '0 0 6px black' }}
                  onMouseDown={(e) => handleRotMouseDown(e, s)} />
              )}
            </div>
          )
        }

        // Cone 和 Line 使用 SVG
        const svgW = Math.max(s.length * mapW * scale * 2, 200)
        const svgH = Math.max(s.length * mapW * scale * 2, 200)
        return (
          <svg key={s.id} data-shape={s.id}
            style={{
              position: 'absolute', left: cx - svgW / 2, top: cy - svgH / 2,
              width: svgW, height: svgH, pointerEvents: 'auto', overflow: 'visible',
              filter: isSelected ? `drop-shadow(0 0 6px ${color}80) drop-shadow(0 0 2px ${color})` : undefined,
            }}
          >
            {s.shape === 'cone' && (() => {
              const halfAngle = s.angle / 2
              const r1 = degToRad(s.rotation - 90 - halfAngle), r2 = degToRad(s.rotation - 90 + halfAngle)
              const len = s.length * mapW * scale
              const scx = svgW / 2, scy = svgH / 2
              const leftX = scx + len * Math.cos(r1), leftY = scy + len * Math.sin(r1)
              const rightX = scx + len * Math.cos(r2), rightY = scy + len * Math.sin(r2)
              const tipX = scx + len * Math.cos(degToRad(s.rotation - 90))
              const tipY = scy + len * Math.sin(degToRad(s.rotation - 90))
              const d = `M ${scx} ${scy} L ${leftX} ${leftY} A ${len} ${len} 0 0 1 ${rightX} ${rightY} Z`
              // Breach C 3椭圆环
              if (s.abilityId === 'breach-aftershock') {
                const dir = degToRad(s.rotation - 90)
                const waves = [0.18, 0.42, 0.65]
                const strokes = [4, 3, 2]
                const ops = [0.9, 0.6, 0.35]
                return (
                  <>
                    <path d={`M ${scx} ${scy} L ${leftX} ${leftY} A ${len} ${len} 0 0 1 ${rightX} ${rightY} Z`}
                      fill="transparent" stroke="transparent" strokeWidth={12}
                      style={{ cursor: 'move' }} onMouseDown={(e) => handleMouseDown(e, s)} />
                    {waves.map((frac, i) => {
                      const ecx = scx + len * frac * Math.cos(dir)
                      const ecy = scy + len * frac * Math.sin(dir)
                      const rx = (len * (1 - frac) * Math.tan(degToRad(s.angle / 2))) * 0.5
                      const ry = rx * 0.35
                      return (<ellipse key={i} cx={ecx} cy={ecy} rx={rx} ry={ry}
                        fill="none" stroke={color} strokeWidth={strokes[i]} opacity={ops[i]}
                        transform={`rotate(${s.rotation} ${ecx} ${ecy})`}
                        style={{ pointerEvents: 'none' }} />)
                    })}
                    <circle cx={scx} cy={scy} r={4} fill="#fff" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={scx + len * 0.3 * Math.cos(dir) - 10} y={scy + len * 0.3 * Math.sin(dir) - 10}
                      width={20} height={20} style={{ pointerEvents: 'none' }} />
                    {isSelected && (<circle cx={scx + len * Math.cos(dir)} cy={scy + len * Math.sin(dir)} r={6}
                      fill="#fff" stroke="#333" strokeWidth={2} style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as any, s) }} />)}
                  </>
                )
              }
              const patternId = info.type === 'recon' ? 'recon-scan' : 'flash-rays'
              return (
                <>
                  {/* 锥形本体 */}
                  <path d={d} fill={color + '30'} stroke={isSelected ? '#fff' : color} strokeWidth={isSelected ? 3 : 2}
                    style={{ cursor: 'move', transition: 'stroke 0.15s' }}
                    onMouseDown={(e) => handleMouseDown(e, s)}
                  />
                  {/* 填充图案 */}
                  <path d={d} fill={`url(#${patternId})`} style={{ pointerEvents: 'none' }} />
                  {/* 扫描弧线 (recon) */}
                  {info.type === 'recon' && [0.3, 0.6].map((frac, i) => {
                    const arcR = len * frac
                    const arcLeft = scx + arcR * Math.cos(r1), arcLeftY = scy + arcR * Math.sin(r1)
                    const arcRight = scx + arcR * Math.cos(r2), arcRightY = scy + arcR * Math.sin(r2)
                    return (
                      <path key={i} d={`M ${arcLeft} ${arcLeftY} A ${arcR} ${arcR} 0 0 1 ${arcRight} ${arcRightY}`}
                        fill="none" stroke={color} strokeWidth={0.8} opacity={0.3} style={{ pointerEvents: 'none' }} />
                    )
                  })}
                  {/* 标签 */}
                  <image href={'/images/abilities/' + s.abilityId + '.png'}
                    x={scx + len * 0.35 * Math.cos(degToRad(s.rotation - 90)) - 14}
                    y={scy + len * 0.35 * Math.sin(degToRad(s.rotation - 90)) - 14}
                    width={28} height={28} style={{ pointerEvents: 'none' }} />
                  {/* 角度弧线标记 */}
                  <path d={`M ${leftX} ${leftY} A ${len * 0.2} ${len * 0.2} 0 0 1 ${rightX} ${rightY}`}
                    fill="none" stroke={color} strokeWidth={1} opacity={0.5} style={{ pointerEvents: 'none' }} />
                  {/* 旋转手柄 */}
                  {isSelected && (
                    <circle cx={tipX} cy={tipY} r={6} fill="#fff" stroke="#333" strokeWidth={2}
                      style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as unknown as React.MouseEvent, s) }} />
                  )}
                </>
              )
            })()}
            {s.shape === 'line' && (() => {
              // Phoenix E 半圆弧线
              if (s.abilityId === 'phoenix-curveball') {
                const halfLen = (s.length * mapW * scale) / 2
                const rad = degToRad(s.rotation)
                const scx = svgW / 2, scy = svgH / 2
                const startX = scx - halfLen * Math.sin(rad), startY = scy + halfLen * Math.cos(rad)
                const endX = scx + halfLen * Math.sin(rad), endY = scy - halfLen * Math.cos(rad)
                const cpX = scx - halfLen * Math.cos(rad), cpY = scy - halfLen * Math.sin(rad)
                const arcD = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`
                const sw2 = Math.max(s.thickness * mapW * scale, 3)
                return (
                  <>
                    <path d={arcD} fill="none" stroke="transparent" strokeWidth={sw2 + 12}
                      strokeLinecap="round" style={{ cursor: 'move' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, s) }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: s.id, updates: { rotation: (s.rotation + 180) % 360 } }) }} />
                    <path d={arcD} fill="none" stroke={color} strokeWidth={sw2}
                      strokeLinecap="round" opacity={0.85}
                      style={{ pointerEvents: 'none', filter: isSelected ? `drop-shadow(0 0 4px ${color})` : undefined }} />
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={startX - 14} y={startY - 14} width={28} height={28} style={{ pointerEvents: 'none' }} />
                    <circle cx={endX} cy={endY} r={10} fill={color} opacity={0.6}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 6px ${color})` }} />
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={endX - 16} y={endY - 16} width={32} height={32}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 8px ${color})` }} />
                    {isSelected && (<circle cx={cpX} cy={cpY - 10} r={6}
                      fill="#fff" stroke="#333" strokeWidth={2} style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as any, s) }} />)}
                  </>
                )
              }
              // 自由路径渲染
              const pathPts = s.path && s.path.length > 1 ? s.path : null
              if (pathPts) {
                const pts = pathPts.map(p => {
                  const px = offset.x + p.x * mapW * scale - (cx - svgW / 2)
                  const py = offset.y + p.y * mapH * scale - (cy - svgH / 2)
                  return px + ',' + py
                }).join(' ')
                const sw = Math.max(s.thickness * mapW * scale, 3)
                return (
                  <>
                    <polyline points={pts} fill="none" stroke="transparent" strokeWidth={sw + 12}
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ cursor: 'move' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, s) }}
                      onClick={(e) => e.stopPropagation()} />
                    <polyline points={pts} fill="none" stroke={color} strokeWidth={sw}
                      strokeLinecap="round" strokeLinejoin="round" opacity={0.85}
                      style={{ pointerEvents: 'none' }} />
                    {/* 海神X波浪动画 */}
                    {s.abilityId === 'harbor-reckoning' && s.path && s.path.length > 1 && (
                      <HarborWave pathPts={s.path} color={color}
                        mapW={mapW} mapH={mapH} scale={scale}
                        svgCenterX={s.x} svgCenterY={s.y}
                        svgHalfW={svgW / 2} svgHalfH={svgH / 2} />
                    )}
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={svgW / 2 - 14} y={svgH / 2 - 14}
                      width={28} height={28} style={{ pointerEvents: 'none' }} />
                  </>
                )
              }
              // 不死鸟闪光曲球：半圆弧线连接两点
              if (s.abilityId === 'phoenix-curveball') {
                const halfLen = (s.length * mapW * scale) / 2
                const rad = degToRad(s.rotation)
                const scx = svgW / 2, scy = svgH / 2
                const startX = scx - halfLen * Math.sin(rad)
                const startY = scy + halfLen * Math.cos(rad)
                const endX = scx + halfLen * Math.sin(rad)
                const endY = scy - halfLen * Math.cos(rad)
                const perpX = halfLen * Math.cos(rad)
                const perpY = halfLen * Math.sin(rad)
                const cpX = scx - perpX, cpY = scy - perpY
                const arcD = `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`
                const sw = Math.max(s.thickness * mapW * scale, 3)
                return (
                  <>
                    <path d={arcD} fill="none" stroke="transparent" strokeWidth={sw + 12}
                      strokeLinecap="round" style={{ cursor: 'move' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, s) }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: s.id, updates: { rotation: (s.rotation + 180) % 360 } }) }} />
                    <path d={arcD} fill="none" stroke={color} strokeWidth={sw}
                      strokeLinecap="round" opacity={0.85}
                      style={{ pointerEvents: 'none', filter: isSelected ? `drop-shadow(0 0 4px ${color})` : undefined }} />
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={startX - 14} y={startY - 14}
                      width={28} height={28} style={{ pointerEvents: 'none' }} />
                    <circle cx={endX} cy={endY} r={10} fill={color} opacity={0.6}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 6px ${color})` }} />
                    <image href={'/images/abilities/' + s.abilityId + '.png'}
                      x={endX - 16} y={endY - 16} width={32} height={32}
                      style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 8px ${color})` }} />
                    {isSelected && (
                      <circle cx={cpX} cy={cpY - 10} r={6} fill="#fff" stroke="#333" strokeWidth={2}
                        style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                        onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as unknown as React.MouseEvent, s) }} />
                    )}
                  </>
                )
              }
              const halfLen = (s.length * mapW * scale) / 2
              const a1 = degToRad(s.rotation - 90), a2 = degToRad(s.rotation + 90)
              const sx1 = svgW / 2 + halfLen * Math.cos(a1), sy1 = svgH / 2 + halfLen * Math.sin(a1)
              const sx2 = svgW / 2 + halfLen * Math.cos(a2), sy2 = svgH / 2 + halfLen * Math.sin(a2)
              const isOmenC = s.abilityId === 'omen-shrouded-step'
              const sw = Math.max(s.thickness * mapW * scale, 3)
              const dashArray = (info.type === 'mobility' || s.abilityId === 'iso-contingency') ? '8 5' : 'none'
              const arrowSize = 8
              const arrowAngle = degToRad(s.rotation - 90)
              const ax1 = sx2 - arrowSize * Math.cos(arrowAngle - 0.5), ay1 = sy2 - arrowSize * Math.sin(arrowAngle - 0.5)
              const ax2 = sx2 - arrowSize * Math.cos(arrowAngle + 0.5), ay2 = sy2 - arrowSize * Math.sin(arrowAngle + 0.5)
              // 双线偏移（霓虹 C 闪电墙）
              const isDualLine = s.abilityId === 'neon-fast-lane'
              const offsetX = isDualLine ? 5 * Math.cos(degToRad(s.rotation)) : 0
              const offsetY = isDualLine ? 5 * Math.sin(degToRad(s.rotation)) : 0
              const renderLine = (ox: number, oy: number, key: string, hitOnly = false) => (
                <line key={key} x1={sx1 + ox} y1={sy1 + oy} x2={sx2 + ox} y2={sy2 + oy}
                  stroke={hitOnly ? 'transparent' : color} strokeWidth={hitOnly ? sw + 12 : sw} strokeLinecap={hitOnly ? 'round' : 'butt'}
                  opacity={hitOnly ? 1 : (isOmenC ? 0 : 0.85)}
                  strokeDasharray={hitOnly ? 'none' : dashArray}
                  style={hitOnly ? { cursor: 'move' } : { cursor: 'move', filter: isSelected ? `drop-shadow(0 0 4px ${color})` : `drop-shadow(0 0 2px ${color}40)`, transition: 'filter 0.15s', pointerEvents: 'none' }}
                  onMouseDown={hitOnly ? (isDualLine ? undefined : (e) => handleMouseDown(e, s)) : undefined}
                  onClick={hitOnly ? (e) => e.stopPropagation() : undefined}
                />
              )
              return (
                <>
                  {/* 透明宽点击区域 */}
                  {isDualLine ? (
                    <g onMouseDown={(e) => handleMouseDown(e, s)} style={{ cursor: 'move' }}>
                      {renderLine(-offsetX, -offsetY, 'hl1', true)}
                      {renderLine(offsetX, offsetY, 'hl2', true)}
                      {renderLine(-offsetX, -offsetY, 'vl1')}
                      {renderLine(offsetX, offsetY, 'vl2')}
                    </g>
                  ) : (
                    <>
                      {renderLine(0, 0, 'hl', true)}
                      {renderLine(0, 0, 'vl')}
                    </>
                  )}
                  {/* 箭头 (位移类型或特定技能) */}
                  {(info.type === 'mobility' || s.abilityId === 'iso-contingency') && (
                    <polygon points={`${sx2},${sy2} ${ax1},${ay1} ${ax2},${ay2}`}
                      fill={color} opacity={0.85} style={{ pointerEvents: 'none' }} />
                  )}
                  {/* 标签 */}
                  <image href={'/images/abilities/' + s.abilityId + '.png'}
                    x={svgW / 2 - 14} y={svgH / 2 - 14}
                    width={28} height={28} style={{ pointerEvents: 'none' }} />
                  {/* 旋转手柄 */}
                  {isSelected && (
                    <circle cx={svgW / 2} cy={svgH / 2 - halfLen - 18} r={6} fill="#fff" stroke="#333" strokeWidth={2}
                      style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as unknown as React.MouseEvent, s) }} />
                  )}
                  {/* 幽影C：线段两端圆形 */}
                  {s.abilityId === 'omen-shrouded-step' && (
                    <>
                      <circle cx={sx1} cy={sy1} r={6} fill={color} opacity={0.6} style={{ pointerEvents: 'none' }} />
                      <circle cx={sx2} cy={sy2} r={6} fill={color} opacity={0.6} style={{ pointerEvents: 'none' }} />
                    </>
                  )}
                </>
              )
            })()}
          </svg>
        )
      })}
    </div>
  )
}
