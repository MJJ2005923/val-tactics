import { useState, useEffect, useRef } from 'react'
import styles from './TextInputModal.module.css'

interface TextInputModalProps {
  x: number
  y: number
  color: string
  fontSize: number
  initialText?: string
  onConfirm: (text: string, color: string, fontSize: number) => void
  onCancel: () => void
  onDelete?: () => void
}

const colors = ['#ffffff', '#ff4655', '#f0c850', '#7ec868', '#50b4f0', '#a070d8', '#ff8c42']
const fontSizes = [14, 18, 24, 32, 48, 64]

export default function TextInputModal({ color: initialColor, fontSize: initialFontSize, initialText, onConfirm, onCancel, onDelete }: TextInputModalProps) {
  const [text, setText] = useState(initialText || '')
  const [color, setColor] = useState(initialColor)
  const [fontSize, setFontSize] = useState(initialFontSize)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!initialText

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onConfirm(trimmed, color, fontSize)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>{isEdit ? '编辑文字标注' : '添加文字标注'}</div>

        <input
          ref={inputRef}
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入文字内容..."
          maxLength={50}
        />

        <div className={styles.preview} style={{ color, fontSize: Math.min(fontSize, 32) + 'px' }}>
          {text || '预览效果'}
        </div>

        <div className={styles.section}>
          <div className={styles.label}>颜色</div>
          <div className={styles.colorRow}>
            {colors.map(c => (
              <button
                key={c}
                className={`${styles.colorBtn} ${color === c ? styles.colorBtnActive : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.label}>字号</div>
          <div className={styles.sizeRow}>
            {fontSizes.map(s => (
              <button
                key={s}
                className={`${styles.sizeBtn} ${fontSize === s ? styles.sizeBtnActive : ''}`}
                onClick={() => setFontSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          {isEdit && onDelete && (
            <button className={styles.deleteBtn} onClick={onDelete}>删除</button>
          )}
          <button className={styles.cancelBtn} onClick={onCancel}>取消</button>
          <button className={styles.confirmBtn} onClick={handleSubmit}>确认</button>
        </div>
      </div>
    </div>
  )
}
