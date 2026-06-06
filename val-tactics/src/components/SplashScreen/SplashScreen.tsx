import { useState, useEffect } from 'react'
import styles from './SplashScreen.module.css'

interface Props {
  onEnter: () => void
}

export default function SplashScreen({ onEnter }: Props) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { setVisible(true) }, [])

  const handleEnter = () => {
    setLeaving(true)
    setTimeout(onEnter, 600)
  }

  return (
    <div className={`${styles.overlay} ${visible ? styles.visible : ''} ${leaving ? styles.leaving : ''}`} onClick={handleEnter}>
      <div className={styles.content}>
        <div className={styles.logoIcon}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="90" height="90">
            <defs><linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
            <rect width="120" height="120" rx="26" fill="none"/>
            <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#sg2)" strokeWidth="2" transform="rotate(-12,37,39)"/>
            <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#sg2)" opacity="0.25" transform="rotate(5,53,35)"/>
            <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#sg2)" strokeWidth="2" transform="rotate(-3,44,54)"/>
            <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#sg2)" opacity="0.35" transform="rotate(10,61,51)"/>
            <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#sg2)" strokeWidth="2" transform="rotate(-8,74,68)"/>
            <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
          </svg>
        </div>
        <div className={styles.subtitle}>VALORANT TACTICS</div>
        <div className={styles.hint}>点击任意位置或按 Enter 进入</div>
      </div>
    </div>
  )
}
