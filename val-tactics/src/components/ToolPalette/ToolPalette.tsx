import { useState } from 'react'
import { useTactics } from '../../store/TacticsContext'
import type { ToolMode } from '../../types'
import styles from './ToolPalette.module.css'

const tools: { mode: ToolMode; icon: string; label: string }[] = [
  { mode: 'select', icon: '✋', label: '选择' },
  { mode: 'freehand', icon: '✏️', label: '画笔' },
  { mode: 'line', icon: '📏', label: '直线' },
  { mode: 'arrow', icon: '➡️', label: '箭头' },
  { mode: 'rect', icon: '⬜', label: '矩形' },
  { mode: 'circle', icon: '⭕', label: '圆形' },
  { mode: 'text', icon: 'T', label: '文字' },
  { mode: 'eraser', icon: '🧹', label: '橡皮' },
]

const drawColors = ['#ff4655', '#f0c850', '#7ec868', '#50b4f0', '#a070d8', '#ff8c42', '#ffffff']
const fontSizes = [14, 18, 24, 32, 48]

export default function ToolPalette() {
  const { toolMode, drawColor, drawWidth, fontSize, markers, drawings, textAnnotations, agentPositions, abilityShapes, dispatch } = useTactics()
  const [showExtras, setShowExtras] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const isDrawTool = toolMode === 'freehand' || toolMode === 'line' || toolMode === 'arrow' || toolMode === 'rect' || toolMode === 'circle'
  const isEmpty = markers.length === 0 && drawings.length === 0 && textAnnotations.length === 0 && agentPositions.length === 0 && abilityShapes.length === 0

  const handleClear = () => {
    if (isEmpty) return
    setShowClearConfirm(true)
  }

  const confirmClear = () => {
    dispatch({ type: 'CLEAR_ALL' })
    setShowClearConfirm(false)
  }

  return (
    <div className={`${styles.palette} ${showExtras ? styles.paletteOpen : ''}`}>
      {/* 主工具行 */}
      <div className={styles.toolRow}>
        {tools.map(t => (
          <button key={t.mode}
            className={`${styles.toolBtn} ${toolMode === t.mode ? styles.toolBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL_MODE', mode: t.mode })}
            title={t.label}>
            {t.icon}
          </button>
        ))}
        <div className={styles.divider} />
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'UNDO' })} title="撤销 Ctrl+Z">↩</button>
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'REDO' })} title="重做 Ctrl+Y">↪</button>
        <div className={styles.divider} />
        <button className={`${styles.toolBtn} ${styles.clearBtn}`} onClick={handleClear} title="清空画布">🗑️</button>
        {(isDrawTool || toolMode === 'text') && (
          <>
            <div className={styles.divider} />
            <button className={`${styles.toolBtn} ${showExtras ? styles.toolBtnActive : ''}`}
              onClick={() => setShowExtras(!showExtras)} title="更多设置">
              {showExtras ? '✕' : '⚙'}
            </button>
          </>
        )}
      </div>

      {/* 扩展面板：颜色 + 粗细 + 字号 */}
      {showExtras && (
        <div className={styles.extras}>
          {(isDrawTool || toolMode === 'text') && (
            <div className={styles.colorRow}>
              {drawColors.map(c => (
                <button key={c}
                  className={`${styles.colorBtn} ${drawColor === c ? styles.colorBtnActive : ''}`}
                  style={{ background: c }}
                  onClick={() => dispatch({ type: 'SET_DRAW_COLOR', color: c })}
                  title={c} />
              ))}
            </div>
          )}
          {isDrawTool && (
            <div className={styles.sliderRow}>
              <span className={styles.sliderLabel}>线宽</span>
              <div className={styles.sliderPreview} style={{ width: drawWidth, height: drawWidth, borderRadius: '50%', background: drawColor, flexShrink: 0 }} />
              <input type="range" min={1} max={12} value={drawWidth}
                onChange={e => dispatch({ type: 'SET_DRAW_WIDTH', width: Number(e.target.value) })}
                className={styles.slider} />
              <span className={styles.sliderVal}>{drawWidth}px</span>
            </div>
          )}
          {toolMode === 'text' && (
            <div className={styles.fontRow}>
              {fontSizes.map(s => (
                <button key={s}
                  className={`${styles.fontBtn} ${fontSize === s ? styles.fontBtnActive : ''}`}
                  onClick={() => dispatch({ type: 'SET_FONT_SIZE', size: s })}>{s}px</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 清空确认弹窗 */}
      {showClearConfirm && (
        <div className={styles.clearConfirm}>
          <span className={styles.clearConfirmText}>确定清空画布？</span>
          <button className={styles.clearConfirmBtn} onClick={confirmClear}>确定</button>
          <button className={styles.clearConfirmCancel} onClick={() => setShowClearConfirm(false)}>取消</button>
        </div>
      )}
    </div>
  )
}
