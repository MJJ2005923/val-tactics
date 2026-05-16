import { useTactics } from '../../store/TacticsContext'
import type { ToolMode } from '../../types'
import styles from './ToolPalette.module.css'

const tools: { mode: ToolMode; label: string; icon: string }[] = [
  { mode: 'select',   label: '选择',    icon: '⊹' },
  { mode: 'freehand', label: '画笔',    icon: '🖊' },
  { mode: 'line',     label: '直线',    icon: '╱' },
  { mode: 'arrow',    label: '箭头',    icon: '→' },
  { mode: 'rect',     label: '矩形',    icon: '□' },
  { mode: 'circle',   label: '圆形',    icon: '○' },
  { mode: 'text',     label: '文字',    icon: 'T' },
  { mode: 'agent',    label: '特工',    icon: '👤' },
  { mode: 'eraser',   label: '橡皮',    icon: '⌫' },
]

const colors = ['#ff4655', '#f0c850', '#7ec868', '#50b4f0', '#a070d8', '#ff8c42', '#ffffff']
const widths = [1, 3, 5, 8]

export default function ToolPalette() {
  const { toolMode, drawColor, drawWidth, dispatch } = useTactics()

  return (
    <div className={styles.palette}>
      <div className={styles.group}>
        {tools.map(t => (
          <button
            key={t.mode}
            className={`${styles.toolBtn} ${toolMode === t.mode ? styles.toolBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL_MODE', mode: t.mode })}
            title={t.label}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.toolLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {(toolMode === 'freehand' || toolMode === 'line' || toolMode === 'arrow' || toolMode === 'rect' || toolMode === 'circle') && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <span className={styles.groupLabel}>颜色</span>
            <div className={styles.colorRow}>
              {colors.map(c => (
                <button
                  key={c}
                  className={`${styles.colorBtn} ${drawColor === c ? styles.colorBtnActive : ''}`}
                  style={{ background: c }}
                  onClick={() => dispatch({ type: 'SET_DRAW_COLOR', color: c })}
                />
              ))}
            </div>
          </div>
          <div className={styles.group}>
            <span className={styles.groupLabel}>粗细</span>
            <div className={styles.widthRow}>
              {widths.map(w => (
                <button
                  key={w}
                  className={`${styles.widthBtn} ${drawWidth === w ? styles.widthBtnActive : ''}`}
                  onClick={() => dispatch({ type: 'SET_DRAW_WIDTH', width: w })}
                >
                  <span className={styles.widthDot} style={{ width: w * 3, height: w * 3 }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.divider} />
      <div className={styles.group}>
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'UNDO' })} title="撤销 Ctrl+Z">
          <span className={styles.toolIcon}>↩</span>
        </button>
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'REDO' })} title="重做 Ctrl+Y">
          <span className={styles.toolIcon}>↪</span>
        </button>
      </div>
    </div>
  )
}
