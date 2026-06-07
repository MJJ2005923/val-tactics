import styles from './SponsorPanel.module.css'

interface Props { onClose: () => void }

export default function SponsorPanel({ onClose }: Props) {
  const tiers = [
    { icon: '🥇', name: '至尊赞助', nameColor: '#ffd700', desc: '¥200+ 累计支持', sponsors: [], cls: styles.tierGold },
    { icon: '🥈', name: '金牌赞助', nameColor: '#c0c0c0', desc: '¥100+ 累计支持', sponsors: [], cls: styles.tierSilver },
    { icon: '🥉', name: '银牌赞助', nameColor: '#cd7f32', desc: '¥50+ 累计支持', sponsors: [], cls: styles.tierBronze },
  ]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <div className={styles.header}>
          <div className={styles.icon}>🏆</div>
          <h1 className={styles.title}>特别鸣谢</h1>
          <p className={styles.sub}>
            每一位赞助者都是 T教练 能够持续运营的动力。<br />
            您的支持让我们可以不断优化 AI、更新知识库、提供更好的战术服务。<br />
            名字将永久留存在此页面。
          </p>
        </div>

        <div className={styles.tiers}>
          {tiers.map(t => (
            <div key={t.name} className={`${styles.tier} ${t.cls}`}>
              <div className={styles.tierIcon}>{t.icon}</div>
              <div className={styles.tierInfo}>
                <div className={styles.tierName} style={{ color: t.nameColor }}>{t.name}</div>
                <div className={styles.tierDesc}>{t.desc}</div>
                {t.sponsors.length > 0 ? (
                  <div className={styles.sponsors}>
                    {t.sponsors.map((s, i) => <span key={i} className={styles.sponsorTag}>{s}</span>)}
                  </div>
                ) : (
                  <div className={styles.empty}>虚位以待</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          赞助后请在爱发电留言或联系开发者，您的名字将在 24 小时内上墙。
        </div>
      </div>
    </div>
  )
}
