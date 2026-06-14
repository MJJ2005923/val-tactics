import { useState, useEffect } from 'react'
import { setAdminKey, clearAdminKey, getAdminKey } from '../../lib/adminAuth'
import styles from './AdminPanel.module.css'

interface Stats {
  totalUsers: number
  tierCounts: Record<string, number>
  online: string
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(() => getAdminKey() || '')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = async (adminKey: string) => {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`)
      const data = await resp.json()
      if (resp.ok) {
        setStats(data)
        setAdminKey(adminKey)
      } else {
        setError(data.error || '密钥错误')
        clearAdminKey()
        setStats(null)
      }
    } catch {
      setError('网络错误，请重试')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (key) fetchStats(key)
  }, [])

  const handleLogin = () => { if (key) fetchStats(key) }

  const tierLabels: Record<string, string> = {
    free: '免费',
    basic: '基础',
    advanced: '进阶',
    pro: '专业',
    ownkey: '自备Key',
  }
  const tierColors: Record<string, string> = {
    free: '#05F8F8',
    basic: '#05F8F8',
    advanced: '#E349ED',
    pro: '#f0c0ff',
    ownkey: '#c0d0ff',
  }

  if (!stats) {
    return (
      <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2>🔐 管理员登录</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.loginArea}>
            <input
              type="password"
              className={styles.keyInput}
              placeholder="输入 ADMIN_KEY"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            />
            <button className={styles.loginBtn} onClick={handleLogin} disabled={loading}>
              {loading ? '验证中...' : '进入'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  const totalTier = Object.values(stats.tierCounts).reduce((a, b) => a + b, 0)

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>📊 管理面板</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 总览卡片 */}
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardValue}>{stats.totalUsers}</div>
            <div className={styles.cardLabel}>注册用户总数</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardValue}>{totalTier || '—'}</div>
            <div className={styles.cardLabel}>已激活套餐</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardValue} style={{ fontSize: 18 }}>
              {stats.totalUsers >= 1000 ? '⚠️ 已过千' : `${Math.max(0, 1000 - stats.totalUsers)}`}
            </div>
            <div className={styles.cardLabel}>
              {stats.totalUsers >= 1000 ? '建议注册营业执照' : '距千用户还差'}
            </div>
          </div>
        </div>

        {/* 套餐分布 */}
        <div className={styles.section}>
          <h3>套餐分布</h3>
          <div className={styles.barChart}>
            {Object.entries(tierLabels).map(([tier, label]) => {
              const count = stats.tierCounts[tier] || 0
              const pct = totalTier > 0 ? (count / totalTier * 100) : 0
              return (
                <div key={tier} className={styles.barRow}>
                  <span className={styles.barLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${pct}%`, background: tierColors[tier] }}
                    />
                  </div>
                  <span className={styles.barCount}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 系统状态 */}
        <div className={styles.section}>
          <h3>系统状态</h3>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot} style={{ background: '#4f6' }} />
              <span>在线</span>
            </div>
            <div className={styles.statusItem}>
              <span>域名</span>
              <span style={{ color: '#05F8F8' }}>{stats.online}</span>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className={styles.section}>
          <h3>快捷操作</h3>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => fetchStats(key)} disabled={loading}>
              🔄 刷新数据
            </button>
            <button className={styles.actionBtn} onClick={async () => {
              try {
                const r = await fetch(`/api/admin/setup-storage?key=${encodeURIComponent(key)}`)
                const d = await r.json()
                alert(d.ok ? 'Storage bucket 已就绪' : `失败: ${d.error}`)
              } catch { alert('网络错误') }
            }}>初始化 Storage</button>
            <button className={styles.actionBtnDanger} onClick={() => {
              clearAdminKey()
              setStats(null)
              setKey('')
            }}>
              退出登录
            </button>
          </div>
        </div>

        {/* 千人提醒 */}
        {stats.totalUsers >= 1000 && (
          <div className={styles.warning}>
            ⚠️ 用户数已超过 1000！建议尽快办理工商营业执照 + ICP 备案。
          </div>
        )}
        {stats.totalUsers >= 500 && stats.totalUsers < 1000 && (
          <div className={styles.warning} style={{ background: 'rgba(255,215,0,.06)', borderColor: 'rgba(255,215,0,.2)' }}>
            📈 用户数接近 1000（当前 {stats.totalUsers}），可以开始准备营业执照材料了。
          </div>
        )}
      </div>
    </div>
  )
}
