import { useState, useEffect } from 'react'
import { setAdminKey, clearAdminKey, getAdminKey } from '../../lib/adminAuth'
import styles from './AdminPanel.module.css'

interface ContentCounts { tactics: number; posts: number; lineups: number; comments: number }
interface Activation { usedCodes: number; totalCodes: number; remaining: number }
interface Stats {
  totalUsers: number; tierCounts: Record<string, number>
  contentCounts: ContentCounts; activation: Activation
  revenue: number; dailyUsage: Record<string, number>
  online: string
}

const tierLabels: Record<string, string> = { free: '免费', basic: '基础', advanced: '进阶', pro: '专业', ownkey: '自备Key', standard: '标准' }
const tierColors: Record<string, string> = { free: '#05F8F8', basic: '#05F8F8', advanced: '#E349ED', pro: '#f0c0ff', ownkey: '#c0d0ff', standard: '#05F8F8' }
const modelNames: Record<string, string> = { 'deepseek-v4-flash': '快速', 'deepseek-chat': '均衡', 'deepseek-reasoner': '推理', 'deepseek-v4-pro': '深度' }
const modelColors: Record<string, string> = { 'deepseek-v4-flash': '#05F8F8', 'deepseek-chat': '#E349ED', 'deepseek-reasoner': '#f0c850', 'deepseek-v4-pro': '#c0d0ff' }

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(() => getAdminKey() || '')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = async (adminKey: string) => {
    setLoading(true); setError('')
    try {
      const resp = await fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`)
      const data = await resp.json()
      if (resp.ok) { setStats(data); setAdminKey(adminKey) }
      else { setError(data.error || '密钥错误'); clearAdminKey(); setStats(null) }
    } catch { setError('网络错误，请重试') }
    setLoading(false)
  }

  useEffect(() => { if (key) fetchStats(key) }, [])
  const handleLogin = () => { if (key) fetchStats(key) }

  if (!stats) {
    return (
      <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className={styles.panel}>
          <div className={styles.header}><h2>🔐 管理员登录</h2><button className={styles.closeBtn} onClick={onClose}>✕</button></div>
          <div className={styles.loginArea}>
            <input type="password" className={styles.keyInput} placeholder="输入 ADMIN_KEY" value={key}
              onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} />
            <button className={styles.loginBtn} onClick={handleLogin} disabled={loading}>{loading ? '验证中...' : '进入'}</button>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  const totalTier = Object.values(stats.tierCounts).reduce((a, b) => a + b, 0)
  const totalDaily = Object.values(stats.dailyUsage).reduce((a, b) => a + b, 0)

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel} style={{ maxWidth: 700 }}>
        <div className={styles.header}><h2>📊 管理面板</h2><button className={styles.closeBtn} onClick={onClose}>✕</button></div>

        {/* 用户 + 套餐总览 */}
        <div className={styles.cards}>
          <div className={styles.card}><div className={styles.cardValue}>{stats.totalUsers}</div><div className={styles.cardLabel}>注册用户</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{totalTier || 0}</div><div className={styles.cardLabel}>付费用户</div></div>
          <div className={styles.card}><div className={styles.cardValue} style={{ fontSize: 18 }}>¥{stats.revenue}</div><div className={styles.cardLabel}>累计收入(估)</div></div>
          <div className={styles.card}><div className={styles.cardValue} style={{ fontSize: 18 }}>{stats.activation.remaining}</div><div className={styles.cardLabel}>剩余激活码</div></div>
        </div>

        {/* 内容统计 */}
        <div className={styles.section}>
          <h3>📝 社区内容</h3>
          <div className={styles.cards} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts.tactics}</div><div className={styles.cardLabel}>战术</div></div>
            <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts.posts}</div><div className={styles.cardLabel}>帖子</div></div>
            <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts.lineups}</div><div className={styles.cardLabel}>点位</div></div>
            <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts.comments}</div><div className={styles.cardLabel}>评论</div></div>
          </div>
        </div>

        {/* AI 每日用量 */}
        <div className={styles.section}>
          <h3>🤖 AI 今日调用量 (共 {totalDaily} 次)</h3>
          <div className={styles.barChart}>
            {Object.entries(stats.dailyUsage).map(([model, count]) => (
              <div key={model} className={styles.barRow}>
                <span className={styles.barLabel}>{modelNames[model] || model}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${totalDaily > 0 ? count / Math.max(totalDaily, 1) * 100 : 0}%`, background: modelColors[model] || '#888' }} />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 套餐分布 */}
        <div className={styles.section}>
          <h3>💳 套餐分布</h3>
          <div className={styles.barChart}>
            {Object.entries(tierLabels).map(([tier, label]) => {
              const count = stats.tierCounts[tier] || 0
              const pct = totalTier > 0 ? (count / totalTier * 100) : 0
              return (
                <div key={tier} className={styles.barRow}>
                  <span className={styles.barLabel}>{label}</span>
                  <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct}%`, background: tierColors[tier] }} /></div>
                  <span className={styles.barCount}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 激活码用量 */}
        <div className={styles.section}>
          <h3>🎫 激活码</h3>
          <div className={styles.cards} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className={styles.card}><div className={styles.cardValue}>{stats.activation.totalCodes}</div><div className={styles.cardLabel}>总生成</div></div>
            <div className={styles.card}><div className={styles.cardValue}>{stats.activation.usedCodes}</div><div className={styles.cardLabel}>已激活</div></div>
            <div className={styles.card}><div className={styles.cardValue}>{stats.activation.remaining}</div><div className={styles.cardLabel}>剩余</div></div>
          </div>
        </div>

        {/* 系统 + 操作 */}
        <div className={styles.section}>
          <h3>⚙ 系统 · {stats.online}</h3>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => fetchStats(key)} disabled={loading}>🔄 刷新</button>
            <button className={styles.actionBtn} onClick={async () => {
              const r = await fetch(`/api/admin/setup-storage?key=${encodeURIComponent(key)}`)
              const d = await r.json()
              alert(d.ok ? 'Storage bucket 已就绪' : '失败')
            }}>初始化 Storage</button>
            <button className={styles.actionBtnDanger} onClick={() => { clearAdminKey(); setStats(null); setKey('') }}>退出</button>
          </div>
        </div>

        {/* 提醒 */}
        {stats.totalUsers >= 1000 && <div className={styles.warning}>⚠️ 用户数已超1000！建议尽快办理营业执照 + ICP备案。</div>}
        {stats.totalUsers >= 500 && stats.totalUsers < 1000 && <div className={styles.warning} style={{ background: 'rgba(255,215,0,.06)', borderColor: 'rgba(255,215,0,.2)' }}>📈 接近1000用户，准备营业执照材料。</div>}
      </div>
    </div>
  )
}
