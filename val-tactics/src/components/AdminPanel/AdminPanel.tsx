import { useState, useEffect } from 'react'
import { setAdminKey, clearAdminKey, getAdminKey } from '../../lib/adminAuth'
import { supabase } from '../../lib/supabase'
import styles from './AdminPanel.module.css'

interface Insight { id: string; category: string; content: string; status: string; created_at: string }

function KnowledgeInsights({ adminKey }: { adminKey: string }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [distilling, setDistilling] = useState(false)

  const loadInsights = async () => {
    const { data } = await supabase.from('knowledge_insights').select('*').order('created_at', { ascending: false }).limit(30)
    setInsights((data || []) as Insight[])
  }

  useEffect(() => { loadInsights() }, [])

  const handleDistill = async () => {
    setDistilling(true)
    try {
      const resp = await fetch(`/api/admin/distill?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await resp.json()
      alert(d.ok ? `蒸馏完成，新增 ${d.count} 条洞察` : (d.msg || '失败'))
    } catch { alert('网络错误') }
    setDistilling(false)
    loadInsights()
  }

  const handleReview = async (id: string, status: string) => {
    await supabase.from('knowledge_insights').update({ status }).eq('id', id)
    loadInsights()
  }

  const pending = insights.filter(i => i.status === 'pending')
  const approved = insights.filter(i => i.status === 'approved')

  return (
    <div className={styles.section}>
      <h3>🧠 知识蒸馏 ({pending.length} 待审 / {approved.length} 已通过)</h3>
      <div className={styles.actions} style={{ marginBottom: 10 }}>
        <button className={styles.actionBtn} onClick={handleDistill} disabled={distilling}>
          {distilling ? '蒸馏中...' : '🤖 AI蒸馏最近对话'}
        </button>
        <button className={styles.actionBtn} onClick={loadInsights}>🔄 刷新</button>
      </div>
      {insights.length === 0 ? (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.15)', padding: '8px 0' }}>暂无洞察，先点「AI蒸馏」从对话中提取</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
          {insights.map(i => (
            <div key={i.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
              background: i.status === 'approved' ? 'rgba(5,248,248,.04)' : i.status === 'rejected' ? 'rgba(255,85,85,.04)' : 'rgba(255,255,255,.01)',
              border: `1px solid ${i.status === 'approved' ? 'rgba(5,248,248,.1)' : i.status === 'rejected' ? 'rgba(255,85,85,.1)' : 'rgba(255,255,255,.03)'}`,
              fontSize: 12,
            }}>
              <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 10, flexShrink: 0 }}>[{i.category}]</span>
              <span style={{ flex: 1, color: i.status === 'rejected' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.6)' }}>{i.content}</span>
              {i.status === 'pending' && (
                <>
                  <button onClick={() => handleReview(i.id, 'approved')} style={{ color: '#05F8F8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✓</button>
                  <button onClick={() => handleReview(i.id, 'rejected')} style={{ color: '#ff5555', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </>
              )}
              <span style={{ color: 'rgba(255,255,255,.1)', fontSize: 9 }}>{i.status === 'pending' ? '待审' : i.status === 'approved' ? '已通过' : '已拒绝'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VersionCheck({ adminKey }: { adminKey: string }) {
  const [checking, setChecking] = useState(false)
  const [verResult, setVerResult] = useState<any>(null)

  const handleCheck = async () => {
    setChecking(true)
    try {
      const resp = await fetch(`/api/admin/check-version?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await resp.json()
      setVerResult(d)
    } catch { alert('网络错误') }
    setChecking(false)
  }

  return (
    <>
      <button className={styles.actionBtn} onClick={handleCheck} disabled={checking}>
        {checking ? '检测中...' : '🔍 检测版本'}
      </button>
      {verResult && (
        <span style={{ fontSize: 11, color: verResult.updated ? '#05F8F8' : 'rgba(255,255,255,.3)' }}>
          {verResult.updated ? `新版本${verResult.version}·${verResult.saved}条` : (verResult.msg || verResult.error || '已最新')}
        </span>
      )}
    </>
  )
}

function WikiCrawl({ adminKey }: { adminKey: string }) {
  const [crawling, setCrawling] = useState(false)

  const handleCrawl = async () => {
    setCrawling(true)
    try {
      const r = await fetch(`/api/admin/crawl-wiki?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await r.json()
      alert(d.ok ? `Wiki爬取完成: ${d.saved} 条洞察` : (d.error || '失败'))
    } catch { alert('网络错误') }
    setCrawling(false)
  }

  return (
    <button className={styles.actionBtn} onClick={handleCrawl} disabled={crawling}>
      {crawling ? '爬取中...' : '🌐 爬取Wiki'}
    </button>
  )
}

function KnowledgeContributions() {
  const [items, setItems] = useState<any[]>([])

  const load = async () => {
    const { data } = await supabase.from('knowledge_contributions').select('*').order('created_at', { ascending: false }).limit(30)
    setItems((data || []))
  }

  useEffect(() => { load() }, [])

  const handleReview = async (id: string, status: string) => {
    await supabase.from('knowledge_contributions').update({ status }).eq('id', id)
    if (status === 'approved') {
      const item = items.find(i => i.id === id)
      if (item) await supabase.from('knowledge_insights').insert({ source: 'user', category: item.category, content: item.content, status: 'approved' })
    }
    load()
  }

  const pending = items.filter(i => i.status === 'pending')

  return (
    <div className={styles.section}>
      <h3>📨 用户知识贡献 ({pending.length} 待审)</h3>
      {items.length === 0 ? (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.15)', padding: '8px 0' }}>暂无贡献</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
          {items.map(i => (
            <div key={i.id} style={{
              padding: '8px 10px', borderRadius: 6, fontSize: 12,
              background: i.status === 'approved' ? 'rgba(5,248,248,.04)' : i.status === 'rejected' ? 'rgba(255,85,85,.04)' : 'rgba(255,255,255,.01)',
              border: `1px solid ${i.status === 'approved' ? 'rgba(5,248,248,.1)' : i.status === 'rejected' ? 'rgba(255,85,85,.1)' : 'rgba(255,255,255,.03)'}`,
            }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <span style={{ color: '#05F8F8', fontSize: 10 }}>[{i.category}]</span>
                <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>{i.user_id?.slice(0,8)}</span>
                {i.source && <span style={{ color: 'rgba(255,255,255,.1)', fontSize: 9 }}>来源: {i.source}</span>}
              </div>
              <div style={{ color: i.status === 'rejected' ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.5)', marginBottom: 4 }}>{i.content}</div>
              {i.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleReview(i.id, 'approved')} style={{ color: '#05F8F8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✓ 通过并入库</button>
                  <button onClick={() => handleReview(i.id, 'rejected')} style={{ color: '#ff5555', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>✕ 拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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

        {/* 知识蒸馏 */}
        <KnowledgeInsights adminKey={key} />
        <KnowledgeContributions />

        {/* 版本检测 + Wiki爬取 */}
        <div className={styles.section}>
          <h3>🔄 数据采集</h3>
          <div className={styles.actions}>
            <VersionCheck adminKey={key} />
            <WikiCrawl adminKey={key} />
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
