import { useState, useEffect } from 'react'
import styles from './SplashScreen.module.css'

interface Props {
  onEnter: () => void
}

export default function SplashScreen({ onEnter }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => { setVisible(true) }, [])

  return (
    <div className={`${styles.overlay} ${visible ? styles.visible : ''}`}>
      <div className={styles.bg} />
      <div className={styles.content}>
        <div className={styles.subtitle}>VALORANT TACTICS</div>
        <h1 className={styles.title}>
          <span className={styles.titleAccent}>无畏契约</span>
          <span className={styles.titleDivider}>/</span>
          <span>战术布置板</span>
        </h1>
        <p className={styles.desc}>
          28 位特工 · 112 项技能 · 精准范围可视化<br />
          拖拽布置 · 即时回放 · 一键导出
        </p>
        <button className={styles.enterBtn} onClick={onEnter}>
          进入战术板
          <span className={styles.btnArrow}>→</span>
        </button>
        <div className={styles.hint}>或按 Enter 键进入</div>
      </div>
    </div>
  )
}
