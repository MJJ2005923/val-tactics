import { useState } from 'react'
import { useTactics } from '../../store/TacticsContext'
import type { ToolMode } from '../../types'
import styles from './ToolPalette.module.css'

type ToolCategory = 'pointer' | 'draw' | 'text' | 'erase'

const tools: { mode: ToolMode; label: string; icon: string; category: ToolCategory }[] = [
  { mode: 'select',   label: '选择', icon: '⊡', category: 'pointer' },
  { mode: 'freehand', label: '画笔', icon: '◎', category: 'draw' },
  { mode: 'line',     label: '直线', icon: '╲', category: 'draw' },
  { mode: 'arrow',    label: '箭头', icon: '↗', category: 'draw' },
  { mode: 'rect',     label: '矩形', icon: '▣', category: 'draw' },
  { mode: 'circle',   label: '圆形', icon: '◉', category: 'draw' },
  { mode: 'text',     label: '文字', icon: 'T', category: 'text' },
  { mode: 'eraser',   label: '橡皮', icon: '✕', category: 'erase' },
]

const drawColors = ['#ff4655', '#f0c850', '#7ec868', '#50b4f0', '#a070d8', '#ff8c42', '#ffffff']
const fontSizes = [14, 18, 24, 32, 48]

export default function ToolPalette() {
  const { toolMode, drawColor, drawWidth, fontSize, dispatch } = useTactics()
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className={styles.palette}>
        <button className={`${styles.toolBtn} ${styles.toolBtnActive}`} onClick={() => setCollapsed(false)} title="展开工具栏">
          <span className={styles.toolIcon}>{tools.find(t => t.mode === toolMode)?.icon || '⊡'}</span>
        </button>
      </div>
    )
  }

  const isDrawTool = toolMode === 'freehand' || toolMode === 'line' || toolMode === 'arrow' || toolMode === 'rect' || toolMode === 'circle'

  return (
    <div className={styles.palette}>
      <div className={styles.paletteHeader}>
        <span className={styles.paletteTitle}>工具</span>
        <button className={styles.collapseBtn} onClick={() => setCollapsed(true)} title="收起">−</button>
      </div>

      {/* 指针工具 */}
      <div className={styles.toolGroup}>
        {tools.filter(t => t.category === 'pointer').map(t => (
          <button
            key={t.mode}
            className={`${styles.toolBtn} ${toolMode === t.mode ? styles.toolBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL_MODE', mode: t.mode })}
            title={`${t.label} — 点击选择/拖拽已有元素`}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.toolLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* 绘图工具 */}
      <div className={styles.toolGroup}>
        {tools.filter(t => t.category === 'draw').map(t => (
          <button
            key={t.mode}
            className={`${styles.toolBtn} ${toolMode === t.mode ? styles.toolBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL_MODE', mode: t.mode })}
            title={`${t.label} — 在地图上拖拽绘制`}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.toolLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* 文字 / 橡皮 */}
      <div className={styles.toolGroup}>
        {tools.filter(t => t.category === 'text' || t.category === 'erase').map(t => (
          <button
            key={t.mode}
            className={`${styles.toolBtn} ${toolMode === t.mode ? styles.toolBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL_MODE', mode: t.mode })}
            title={t.mode === 'text' ? '点击地图添加文字' : '点击已有图形/标记删除'}
          >
            <span className={styles.toolIcon}>{t.icon}</span>
            <span className={styles.toolLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 颜色 — 仅绘图/文字工具显示 */}
      {(isDrawTool || toolMode === 'text') && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <span className={styles.groupLabel}>颜色</span>
            <div className={styles.colorRow}>
              {drawColors.map(c => (
                <button
                  key={c}
                  className={`${styles.colorBtn} ${drawColor === c ? styles.colorBtnActive : ''}`}
                  style={{ background: c }}
                  onClick={() => dispatch({ type: 'SET_DRAW_COLOR', color: c })}
                  title={c}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 粗细 — 仅绘图工具 */}
      {isDrawTool && (
        <div className={styles.group}>
          <div className={styles.sliderHeader}>
            <span className={styles.groupLabel}>粗细</span>
            <span className={styles.sliderValue}>{drawWidth}px</span>
          </div>
          <div className={styles.sliderRow}>
            <span className={styles.sliderPreview} style={{ borderWidth: 1 }} />
            <input
              type="range"
              min={1}
              max={12}
              value={drawWidth}
              onChange={(e) => dispatch({ type: 'SET_DRAW_WIDTH', width: Number(e.target.value) })}
              className={styles.slider}
              title={`线宽 ${drawWidth}px`}
            />
            <span className={styles.sliderPreview} style={{ borderWidth: 4 }} />
          </div>
        </div>
      )}

      {/* 字号 — 仅文字工具 */}
      {toolMode === 'text' && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>字号</span>
          <div className={styles.widthRow}>
            {fontSizes.map(s => (
              <button
                key={s}
                className={`${styles.widthBtn} ${fontSize === s ? styles.widthBtnActive : ''}`}
                onClick={() => dispatch({ type: 'SET_FONT_SIZE', size: s })}
                title={`${s}px`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.divider} />
      <div className={styles.group}>
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'UNDO' })} title="撤销 Ctrl+Z">
          <span className={styles.toolIcon}>↶</span>
        </button>
        <button className={styles.toolBtn} onClick={() => dispatch({ type: 'REDO' })} title="重做 Ctrl+Y">
          <span className={styles.toolIcon}>↷</span>
        </button>
      </div>

      {/* 使用提示 */}
      <div className={styles.hint}>
        {toolMode === 'select' && '点击/拖拽元素'}
        {isDrawTool && '在地图上绘制'}
        {toolMode === 'text' && '点击地图添加文字'}
        {toolMode === 'eraser' && '点击删除图形/标记'}
      </div>
    </div>
  )
}
