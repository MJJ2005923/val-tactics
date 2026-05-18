import { useRef, useCallback, useEffect } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import type { AbilityShape } from '../../types'

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

interface AbilityInfo { color: string; key: string; name: string; type: string; gradient: string; iconUrl: string }

function getAbilityInfo(shape: AbilityShape): AbilityInfo {
  const agent = agents.find(a => a.id === shape.agentId)
  const ab = agent?.abilities.find(a => a.id === shape.abilityId)
  const type = ab?.type || 'smoke'
  const ts = typeStyles[type]
  const svgColor = typeColors[type] || '#888'
  return {
    color: svgColor,
    key: ab?.key || '',
    name: ab?.name || '',
    type,
    gradient: ts?.gradient || '',
    iconUrl: ab?.iconUrl || '',
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
  const { abilityShapes, selectedId, selectedType, dispatch } = useTactics()
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
        dispatch({ type: 'UPDATE_ABILITY_SHAPE', id: d.shapeId, updates: { x: d.startShape.x + dx, y: d.startShape.y + dy } })
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
    dispatch({ type: 'SELECT', id: shape.id, selType: 'abilityShape' })
    dragRef.current = { shapeId: shape.id, mode: 'move', startMouse: { x: e.clientX, y: e.clientY }, startShape: { ...shape } }
  }, [dispatch])

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

      {abilityShapes.map(s => {
        const isSelected = s.id === selectedId && selectedType === 'abilityShape'
        const info = getAbilityInfo(s)
        const { color, key, gradient } = info
        const cx = offset.x + s.x * mapW * scale
        const cy = offset.y + s.y * mapH * scale
        const selectedGlow = isSelected ? `0 0 16px ${color}80, 0 0 4px ${color}` : ''

        if (s.shape === 'circle') {
          const r = Math.max(s.radius * mapW * scale, 8)
          const patternFill = info.type === 'recon' ? 'url(#recon-scan)' : info.type === 'smoke' ? 'url(#smoke-swirl)' : info.type === 'heal' ? 'url(#heal-cross)' : info.type === 'control' ? 'url(#control-grid)' : 'none'
          return (
            <div key={s.id} style={{ position: 'absolute', pointerEvents: 'auto' }}>
              {/* 外发光 */}
              {isSelected && <div style={{
                position: 'absolute', left: cx - r - 8, top: cy - r - 8, width: (r + 8) * 2, height: (r + 8) * 2,
                borderRadius: '50%', background: `${color}10`, boxShadow: `0 0 20px ${color}30`,
              }} />}
              {/* 形状主体 */}
              <div style={{
                position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2,
                borderRadius: '50%', border: `2px solid ${isSelected ? '#fff' : color}`,
                background: `${gradient}, ${patternFill}`,
                cursor: 'move',
                boxShadow: selectedGlow || `0 0 4px ${color}20`,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
                onMouseDown={(e) => handleMouseDown(e, s)}
              />
              {/* 图标 + 键位标签 */}
              <div style={{
                position: 'absolute', left: cx - 18, top: cy - 26,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                pointerEvents: 'none',
              }}>
                <img src={info.iconUrl}
                  style={{ width: 36, height: 36, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', background: color,
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}>{key}</span>
              </div>
              {/* 旋转手柄 */}
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
          const patternFill = info.type === 'control' ? 'url(#control-grid)' : info.type === 'smoke' ? 'url(#smoke-swirl)' : 'none'
          return (
            <div key={s.id} style={{ position: 'absolute', pointerEvents: 'auto' }}>
              <div style={{
                position: 'absolute', left: cx - hw, top: cy - hh, width: hw * 2, height: hh * 2,
                border: `2px solid ${isSelected ? '#fff' : color}`, borderRadius: 3,
                background: `${gradient}, ${patternFill}`,
                cursor: 'move', transform: `rotate(${s.rotation}deg)`,
                boxShadow: selectedGlow || `0 0 3px ${color}30`,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
                onMouseDown={(e) => handleMouseDown(e, s)}
              />
              <div style={{
                position: 'absolute', left: cx - 18, top: cy - 26,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                pointerEvents: 'none',
              }}>
                <img src={info.iconUrl}
                  style={{ width: 36, height: 36, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', background: color,
                  color: '#fff', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}>{key}</span>
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
          <svg key={s.id}
            style={{
              position: 'absolute', left: cx - svgW / 2, top: cy - svgH / 2,
              width: svgW, height: svgH, pointerEvents: 'auto', overflow: 'visible',
              filter: selectedGlow ? `drop-shadow(0 0 6px ${color}80) drop-shadow(0 0 2px ${color})` : undefined,
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
                  <circle cx={scx + len * 0.35 * Math.cos(degToRad(s.rotation - 90))} cy={scy + len * 0.35 * Math.sin(degToRad(s.rotation - 90))} r={14} fill={color} stroke="#fff" strokeWidth={1.5}
                    style={{ pointerEvents: 'none' }} />
                  <text x={scx + len * 0.35 * Math.cos(degToRad(s.rotation - 90))} y={scy + len * 0.35 * Math.sin(degToRad(s.rotation - 90)) + 5}
                    textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold"
                    style={{ pointerEvents: 'none' }}>{key}</text>
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
              const halfLen = (s.length * mapW * scale) / 2
              const a1 = degToRad(s.rotation - 90), a2 = degToRad(s.rotation + 90)
              const sx1 = svgW / 2 + halfLen * Math.cos(a1), sy1 = svgH / 2 + halfLen * Math.sin(a1)
              const sx2 = svgW / 2 + halfLen * Math.cos(a2), sy2 = svgH / 2 + halfLen * Math.sin(a2)
              const sw = Math.max(s.thickness * mapW * scale, 3)
              const dashArray = info.type === 'mobility' ? '8 4' : 'none'
              return (
                <>
                  {/* 虚线 / 实线 */}
                  <line x1={sx1} y1={sy1} x2={sx2} y2={sy2}
                    stroke={color} strokeWidth={sw} strokeLinecap="round" opacity={0.85}
                    strokeDasharray={dashArray}
                    style={{ cursor: 'move', filter: isSelected ? `drop-shadow(0 0 4px ${color})` : `drop-shadow(0 0 2px ${color}40)`, transition: 'filter 0.15s' }}
                    onMouseDown={(e) => handleMouseDown(e, s)}
                  />
                  {/* 箭头 (位移类型) */}
                  {info.type === 'mobility' && (
                    <line x1={svgW / 2} y1={svgH / 2} x2={sx2} y2={sy2}
                      stroke={color} strokeWidth={sw} markerEnd="url(#arrowhead)" opacity={0}
                      style={{ pointerEvents: 'none' }} />
                  )}
                  {/* 标签 */}
                  <circle cx={svgW / 2} cy={svgH / 2} r={14} fill={color} stroke="#fff" strokeWidth={1}
                    style={{ pointerEvents: 'none' }} />
                  <text x={svgW / 2} y={svgH / 2 + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold"
                    style={{ pointerEvents: 'none' }}>{key}</text>
                  {/* 旋转手柄 */}
                  {isSelected && (
                    <circle cx={svgW / 2} cy={svgH / 2 - halfLen - 14} r={6} fill="#fff" stroke="#333" strokeWidth={2}
                      style={{ cursor: 'grab', filter: 'drop-shadow(0 0 4px black)' }}
                      onMouseDown={(e) => { e.stopPropagation(); handleRotMouseDown(e as unknown as React.MouseEvent, s) }} />
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
