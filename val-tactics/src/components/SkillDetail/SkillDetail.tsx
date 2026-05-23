import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Ability } from '../../data/agents'
import styles from './SkillDetail.module.css'

interface SkillDetailProps {
  ability: Ability
  agentName: string
  agentRole: string
  onClose: () => void
}

const typeLabels: Record<string, string> = {
  smoke: '烟雾',
  flash: '闪光',
  damage: '伤害',
  recon: '侦查',
  control: '控制',
  heal: '治疗',
  mobility: '位移'
}

const keyLabels: Record<string, string> = {
  C: 'C 键',
  Q: 'Q 键',
  E: 'E 键',
  X: 'X 键（大招）'
}

export default function SkillDetail({ ability, agentName, agentRole, onClose }: SkillDetailProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    const preventScroll = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        e.preventDefault()
        return
      }
      e.stopPropagation()
    }
    el.addEventListener('wheel', preventScroll, { passive: false })
    return () => el.removeEventListener('wheel', preventScroll)
  }, [])

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.agentInfo}>{agentName} · {agentRole}</span>
            <h3 className={styles.abilityTitle}>{ability.name}</h3>
            <span className={styles.abilityEn}>{ability.nameEn}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.meta}>
            <span className={styles.keyBadge}>{keyLabels[ability.key]}</span>
            <span className={styles.typeBadge}>{typeLabels[ability.type]}</span>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>技能介绍</h4>
            <p className={styles.sectionText}>{ability.description}</p>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>释放方式</h4>
            <p className={styles.sectionText}>{ability.usage}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
