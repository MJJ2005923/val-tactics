import { useState, useEffect, useCallback } from 'react'
import { setAdminKey, clearAdminKey, getAdminKey } from '../../lib/adminAuth'
import { supabase } from '../../lib/supabase'
import styles from './AdminPage.module.css'

interface Props { onClose: () => void }

type NavItem = 'dashboard' | 'review'
type ReviewTab = 'insights' | 'contributions' | 'conversations'

// ============ 数据面板 ============
function Dashboard({ adminKey, refreshTrigger }: { adminKey: string; refreshTrigger: number }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancel = false
    fetch(`/api/admin/stats?key=${encodeURIComponent(adminKey)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancel) return
        if (ok) { setStats(d); setError('') }
        else { setError(d.error || '获取失败'); setStats(null) }
      })
      .catch(() => { if (!cancel) setError('网络错误') })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [adminKey, refreshTrigger])

  if (loading) return <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 30 }}>加载中...</div>
  if (error) return <div style={{ fontSize: 12, color: '#ff5555', textAlign: 'center', padding: 30 }}>{error}</div>
  if (!stats) return null

  const totalTier = Object.values<number>(stats.tierCounts || {}).reduce((a, b) => a + b, 0)
  const totalDaily = Object.values<number>(stats.dailyUsage || {}).reduce((a, b) => a + b, 0)

  const tierLabels: Record<string, string> = { free: '免费', basic: '基础', advanced: '进阶', pro: '专业', ownkey: '自备Key', standard: '标准' }
  const tierColors: Record<string, string> = { free: '#05F8F8', basic: '#05F8F8', advanced: '#E349ED', pro: '#f0c0ff', ownkey: '#c0d0ff', standard: '#05F8F8' }
  const modelNames: Record<string, string> = { 'deepseek-v4-flash': '快速', 'deepseek-chat': '均衡', 'deepseek-reasoner': '推理', 'deepseek-v4-pro': '深度' }
  const modelColors: Record<string, string> = { 'deepseek-v4-flash': '#05F8F8', 'deepseek-chat': '#E349ED', 'deepseek-reasoner': '#f0c850', 'deepseek-v4-pro': '#c0d0ff' }

  return (
    <>
      {/* 用户 + 收入 */}
      <div className={styles.cards}>
        <div className={styles.card}><div className={styles.cardValue}>{stats.totalUsers}</div><div className={styles.cardLabel}>注册用户</div></div>
        <div className={styles.card}><div className={styles.cardValue}>{totalTier || 0}</div><div className={styles.cardLabel}>付费用户</div></div>
        <div className={styles.card}><div className={styles.cardValue} style={{ fontSize: 18 }}>¥{stats.revenue}</div><div className={styles.cardLabel}>累计收入(估)</div></div>
        <div className={styles.card}><div className={styles.cardValue} style={{ fontSize: 18 }}>{stats.activation?.remaining || 0}</div><div className={styles.cardLabel}>剩余激活码</div></div>
      </div>

      {/* 社区内容 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📝 社区内容</h3>
        <div className={styles.cards}>
          <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts?.tactics || 0}</div><div className={styles.cardLabel}>战术</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts?.posts || 0}</div><div className={styles.cardLabel}>帖子</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts?.lineups || 0}</div><div className={styles.cardLabel}>点位</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{stats.contentCounts?.comments || 0}</div><div className={styles.cardLabel}>评论</div></div>
        </div>
      </div>

      {/* AI 用量 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🤖 AI 今日调用 ({totalDaily} 次)</h3>
        <div className={styles.barChart}>
          {Object.entries<number>(stats.dailyUsage || {}).map(([model, count]) => (
            <div key={model} className={styles.barRow}>
              <span className={styles.barLabel}>{modelNames[model] || model}</span>
              <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${totalDaily > 0 ? count / Math.max(totalDaily, 1) * 100 : 0}%`, background: modelColors[model] || '#888' }} /></div>
              <span className={styles.barCount}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 套餐分布 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>💳 套餐分布</h3>
        <div className={styles.barChart}>
          {Object.entries(tierLabels).map(([tier, label]) => {
            const count = (stats.tierCounts || {})[tier] || 0
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

      {/* 激活码 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🎫 激活码</h3>
        <div className={styles.cards}>
          <div className={styles.card}><div className={styles.cardValue}>{stats.activation?.totalCodes || 0}</div><div className={styles.cardLabel}>总生成</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{stats.activation?.usedCodes || 0}</div><div className={styles.cardLabel}>已激活</div></div>
          <div className={styles.card}><div className={styles.cardValue}>{stats.activation?.remaining || 0}</div><div className={styles.cardLabel}>剩余</div></div>
        </div>
      </div>

      {/* 警告 */}
      {stats.totalUsers >= 1000 && <div className={styles.warning}>⚠️ 用户数已超1000！建议尽快办理营业执照 + ICP备案。</div>}
      {stats.totalUsers >= 500 && stats.totalUsers < 1000 && <div className={styles.warning} style={{ background: 'rgba(255,215,0,.05)', borderColor: 'rgba(255,215,0,.15)' }}>📈 接近1000用户，准备营业执照材料。</div>}
    </>
  )
}

// ============ 审核中心（含数据采集 + 洞察审核 + 贡献审核 + 对话日志）============
function ReviewCenter({ adminKey }: { adminKey: string }) {
  const [tab, setTab] = useState<ReviewTab>('insights')
  const [insights, setInsights] = useState<any[]>([])
  const [contributions, setContributions] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [convPage, setConvPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showOnly, setShowOnly] = useState<'all' | 'pending'>('pending')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setEditContent(item.content)
  }
  const saveEdit = async () => {
    if (!editingId) return
    await supabase.from('knowledge_insights').update({ content: editContent }).eq('id', editingId)
    setInsights(prev => prev.map(i => i.id === editingId ? { ...i, content: editContent } : i))
    setEditingId(null)
    setEditContent('')
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  // 数据采集
  const [distilling, setDistilling] = useState(false)
  const [checkingVer, setCheckingVer] = useState(false)
  const [crawlingWiki, setCrawlingWiki] = useState(false)
  const [loadingVCT, setLoadingVCT] = useState(false)
  const [verResult, setVerResult] = useState<any>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const irQuery = supabase.from('knowledge_insights').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(100)
      const [ir, cr, cvr] = await Promise.all([
        showOnly === 'pending' ? irQuery : supabase.from('knowledge_insights').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('knowledge_contributions').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(30),
        supabase.from('conversation_logs').select('*').eq('role', 'user').order('created_at', { ascending: false }).range(convPage * 20, (convPage + 1) * 20 - 1),
      ])
      const errs = [ir.error, cr.error, cvr.error].filter(Boolean)
      if (errs.length > 0) {
        console.error('审核中心查询错误:', errs)
        setError(errs.map((e: any) => e.message || e).join('; '))
      } else {
        setError('')
      }
      setInsights((ir.data || []) as any[])
      setContributions((cr.data || []) as any[])
      setConversations((cvr.data || []) as any[])
    } catch (e: any) {
      console.error('loadAll failed:', e)
      setError(e.message || '查询失败')
    }
    setLoading(false)
  }, [showOnly, convPage])

  useEffect(() => { loadAll() }, [loadAll])

  const handleInsight = async (id: string, status: string) => {
    await supabase.from('knowledge_insights').update({ status }).eq('id', id)
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const handleContribution = async (id: string, status: string) => {
    await supabase.from('knowledge_contributions').update({ status }).eq('id', id)
    if (status === 'approved') {
      const item = contributions.find(i => i.id === id)
      if (item) await supabase.from('knowledge_insights').insert({ source: 'user', category: item.category, content: item.content, status: 'approved' })
    }
    setContributions(prev => prev.filter(i => i.id !== id))
  }

  // 批量蒸馏
  const handleBatchDistill = async () => {
    setDistilling(true)
    try {
      const resp = await fetch(`/api/admin/distill?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await resp.json()
      alert(d.ok ? `蒸馏完成，新增 ${d.count} 条洞察` : (d.msg || '失败'))
      loadAll()
    } catch { alert('网络错误') }
    setDistilling(false)
  }

  // 单条蒸馏
  const distillOne = async (convId: string) => {
    const conv = conversations.find(c => c.id === convId)
    if (!conv?.content) return alert('无对话内容')
    try {
      const resp = await fetch(`/api/admin/distill?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationContent: conv.content }),
      })
      const d = await resp.json()
      alert(d.ok ? `蒸馏完成，新增 ${d.count} 条洞察` : (d.msg || '失败'))
      loadAll()
    } catch { alert('网络错误') }
  }

  // 版本检测
  const handleVersion = async () => {
    setCheckingVer(true)
    try {
      const resp = await fetch(`/api/admin/check-version?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      setVerResult(await resp.json())
    } catch { alert('网络错误') }
    setCheckingVer(false)
  }

  // Wiki 爬取
  const handleWiki = async () => {
    setCrawlingWiki(true)
    try {
      const r = await fetch(`/api/admin/crawl-wiki?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        const msg = d.errors?.length > 0
          ? `Wiki: 成功 ${d.saved} 条, 失败 ${d.errors.length} 条\n${d.errors.join('\n')}`
          : `Wiki爬取完成: ${d.saved} 条`
        alert(msg)
        if (d.saved > 0) loadAll()
      } else {
        alert(d.error || '失败')
      }
    } catch { alert('网络错误') }
    setCrawlingWiki(false)
  }

  // VCT 赛事
  const handleVCT = async () => {
    setLoadingVCT(true)
    try {
      const r = await fetch(`/api/admin/vct-insights?key=${encodeURIComponent(adminKey)}`, { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        const msg = d.errors?.length > 0
          ? `VCT: 成功 ${d.saved} 条, 失败 ${d.errors.length} 条\n${d.errors.join('\n')}`
          : `VCT洞察: ${d.saved} 条`
        alert(msg)
        if (d.saved > 0) loadAll()
      } else {
        alert(d.error || '失败')
      }
    } catch { alert('网络错误') }
    setLoadingVCT(false)
  }

  const sourceLabels: Record<string, string> = { wiki: 'Wiki', vct: 'VCT', version: '版本', conversation: '对话', user: '用户' }
  const pendingInsights = insights.filter(i => i.status === 'pending')

  return (
    <>
      {/* 数据采集工具栏 */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🔄 数据采集</h3>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleBatchDistill} disabled={distilling}>
            {distilling ? '蒸馏中...' : '🤖 批量蒸馏'}
          </button>
          <button className={styles.actionBtn} onClick={handleVersion} disabled={checkingVer}>
            {checkingVer ? '检测中...' : '🔍 检测版本'}
          </button>
          <button className={styles.actionBtn} onClick={handleWiki} disabled={crawlingWiki}>
            {crawlingWiki ? '爬取中...' : '🌐 爬取Wiki'}
          </button>
          <button className={styles.actionBtn} onClick={handleVCT} disabled={loadingVCT}>
            {loadingVCT ? '生成中...' : '🏆 VCT赛事'}
          </button>
        </div>
        {verResult && (
          <div style={{ marginTop: 8, fontSize: 11, color: verResult.updated ? '#05F8F8' : 'rgba(255,255,255,.2)' }}>
            {verResult.updated ? `新版本 ${verResult.version} · 入库 ${verResult.saved} 条` : (verResult.msg || verResult.error || '已是最新版本')}
          </div>
        )}
      </div>

      {/* 审核 Tab */}
      <div className={styles.reviewTabs}>
        <button className={`${styles.reviewTab} ${tab === 'insights' ? styles.reviewTabActive : ''}`} onClick={() => setTab('insights')}>
          AI洞察 ({pendingInsights.length})
        </button>
        <button className={`${styles.reviewTab} ${tab === 'contributions' ? styles.reviewTabActive : ''}`} onClick={() => setTab('contributions')}>
          用户贡献 ({contributions.length})
        </button>
        <button className={`${styles.reviewTab} ${tab === 'conversations' ? styles.reviewTabActive : ''}`} onClick={() => setTab('conversations')}>
          对话日志
        </button>
        <span style={{ flex: 1 }} />
        <button className={styles.actionBtn} onClick={() => { setShowOnly(s => s === 'all' ? 'pending' : 'all') }} style={{ fontSize: 10, padding: '3px 8px', marginRight: 4 }}>
          {showOnly === 'all' ? '只看待审' : '查看全部'}
        </button>
        <button className={styles.actionBtn} onClick={loadAll} style={{ fontSize: 10, padding: '3px 10px' }}>🔄 刷新</button>
      </div>

      {loading && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 20 }}>加载中...</div>}
      {error && <div style={{ fontSize: 12, color: '#ff5555', textAlign: 'center', padding: 10, marginBottom: 8, background: 'rgba(255,85,85,.06)', borderRadius: 8 }}>⚠️ {error}</div>}

      {/* AI 洞察 */}
      {tab === 'insights' && (insights.length === 0
        ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.08)', textAlign: 'center', padding: 30 }}>暂无洞察</div>
        : insights.map(i => {
          const isExpanded = expanded.has(i.id)
          const isLong = i.content?.length > 150
          const displayContent = isExpanded || !isLong ? i.content : i.content?.slice(0, 150) + '...'
          return (
          <div key={i.id} style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 6,
            background: i.status === 'approved' ? 'rgba(5,248,248,.03)' : i.status === 'rejected' ? 'rgba(255,85,85,.03)' : 'rgba(255,255,255,.01)',
            border: `1px solid ${i.status === 'approved' ? 'rgba(5,248,248,.08)' : i.status === 'rejected' ? 'rgba(255,85,85,.08)' : 'rgba(255,255,255,.03)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ color: '#05F8F8', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>[{sourceLabels[i.source] || i.source}] {i.category && i.category !== '战术' ? i.category : ''}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10, flexShrink: 0 }}>{new Date(i.created_at).toLocaleString('zh')}</span>
              {i.status === 'pending' && editingId !== i.id && (
                <>
                  <button className={styles.reviewItemBtn} style={{ color: 'rgba(255,255,255,.4)', border: '1px solid rgba(255,255,255,.15)' }} onClick={() => startEdit(i)}>✏️ 编辑</button>
                  <button className={styles.reviewItemBtn} style={{ color: '#05F8F8', border: '1px solid rgba(5,248,248,.2)' }} onClick={() => handleInsight(i.id, 'approved')}>✓ 通过</button>
                  <button className={styles.reviewItemBtn} style={{ color: '#ff5555', border: '1px solid rgba(255,85,85,.2)' }} onClick={() => handleInsight(i.id, 'rejected')}>✕ 拒绝</button>
                </>
              )}
              {i.status === 'pending' && editingId === i.id && (
                <>
                  <button className={styles.reviewItemBtn} style={{ color: '#05F8F8', border: '1px solid rgba(5,248,248,.3)' }} onClick={saveEdit}>💾 保存</button>
                  <button className={styles.reviewItemBtn} style={{ color: 'rgba(255,255,255,.3)', border: '1px solid rgba(255,255,255,.15)' }} onClick={cancelEdit}>取消</button>
                </>
              )}
              {i.status !== 'pending' && <span style={{ color: 'rgba(255,255,255,.06)', fontSize: 9, flexShrink: 0 }}>{i.status === 'approved' ? '已通过' : '已拒绝'}</span>}
            </div>
            {editingId === i.id ? (
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                style={{
                  width: '100%', minHeight: 200, padding: 10, borderRadius: 6,
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(5,248,248,.15)',
                  color: 'rgba(255,255,255,.7)', fontSize: 12, fontFamily: 'inherit',
                  lineHeight: 1.7, resize: 'vertical', whiteSpace: 'pre-wrap',
                }} />
            ) : (
              <>
                <div style={{
                  color: i.status === 'rejected' ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.5)',
                  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{displayContent.split('\\n').join('\n')}</div>
                {isLong && (
                  <button onClick={() => toggleExpand(i.id)} style={{
                    marginTop: 4, padding: '2px 8px', border: 'none', borderRadius: 4,
                    background: 'rgba(255,255,255,.03)', color: 'rgba(5,248,248,.5)',
                    cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                  }}>{isExpanded ? '▲ 收起' : '▼ 展开 (' + i.content.length + '字)'}</button>
                )}
              </>
            )}
          </div>
        )})
      )}

      {/* 用户贡献 */}
      {tab === 'contributions' && (contributions.length === 0
        ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.08)', textAlign: 'center', padding: 30 }}>暂无待审贡献</div>
        : contributions.map(c => (
          <div key={c.id} className={styles.contributionCard}>
            <div className={styles.contributionMeta}>
              <span className={styles.contributionCat}>[{c.category}]</span>
              <span className={styles.contributionUser}>{c.user_id?.slice(0, 8)}</span>
              {c.source && <span style={{ color: 'rgba(255,255,255,.06)', fontSize: 9 }}>来源: {c.source}</span>}
            </div>
            <div className={styles.contributionBody}>{c.content}</div>
            <div className={styles.contributionActions}>
              <button className={styles.actionBtn} style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleContribution(c.id, 'approved')}>✓ 通过入库</button>
              <button className={styles.actionBtnDanger} style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleContribution(c.id, 'rejected')}>✕ 拒绝</button>
            </div>
          </div>
        ))
      )}

      {/* 对话日志 */}
      {tab === 'conversations' && (conversations.length === 0
        ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.08)', textAlign: 'center', padding: 30 }}>暂无对话</div>
        : <>
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => setConvPage(p => Math.max(0, p - 1))}>← 上一页</button>
            <span className={styles.pageInfo}>第 {convPage + 1} 页</span>
            <button className={styles.pageBtn} onClick={() => setConvPage(p => p + 1)}>下一页 →</button>
          </div>
          {conversations.map(c => {
            let ctx: any = null
            try { ctx = c.context ? (typeof c.context === 'string' ? JSON.parse(c.context) : c.context) : null } catch {}
            return (
              <div key={c.id} className={styles.convCard}>
                <div className={styles.convContent}>{c.content?.slice(0, 200)}</div>
                {ctx && (
                  <div className={styles.convCtx}>
                    {ctx.mapName && <span className={`${styles.convCtxTag} ${styles.convCtxMap}`}>🗺 {ctx.mapName}</span>}
                    {ctx.side && <span className={`${styles.convCtxTag} ${styles.convCtxSide}`} style={{ color: ctx.side === 'attack' ? '#ff4655' : '#50b4f0' }}>{ctx.side === 'attack' ? '进攻' : '防守'}</span>}
                    {ctx.ally && <span className={styles.convCtxTag}>我方: {ctx.ally}</span>}
                    {ctx.enemy && <span className={styles.convCtxTag}>敌方: {ctx.enemy}</span>}
                    {ctx.agents?.length > 0 && <span className={styles.convCtxTag}>特工: {ctx.agents.join(', ')}</span>}
                  </div>
                )}
                <div className={styles.convFooter}>
                  <span className={styles.convTime}>{new Date(c.created_at).toLocaleString('zh')}</span>
                  <button className={styles.actionBtn} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(227,73,237,.08)', borderColor: 'rgba(227,73,237,.15)', color: '#E349ED' }} onClick={() => distillOne(c.id)}>⚡ 蒸馏</button>
                </div>
              </div>
            )
          })}
        </>
      )}
    </>
  )
}

// ============ 主页面 ============
export default function AdminPage({ onClose }: Props) {
  const [key, setKey] = useState(() => getAdminKey() || '')
  const [authed, setAuthed] = useState(() => !!getAdminKey())
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [nav, setNav] = useState<NavItem>('dashboard')
  const [refreshK, setRefreshK] = useState(0)

  const adminKey = getAdminKey() || key

  const handleLogin = async () => {
    if (!key) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const resp = await fetch(`/api/admin/stats?key=${encodeURIComponent(key)}`)
      if (resp.ok) {
        setAdminKey(key)
        setAuthed(true)
      } else {
        const d = await resp.json().catch(() => ({}))
        setLoginError((d as any).error || '密钥错误')
      }
    } catch {
      setLoginError('网络错误，请重试')
    }
    setLoginLoading(false)
  }

  const handleLogout = () => {
    clearAdminKey()
    setAuthed(false)
    setKey('')
    setNav('dashboard')
  }

  return (
    <div className={styles.page}>
      {/* 左侧边栏 */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <span className={styles.brandDot} />
            <h1 className={styles.brandTitle}>管理后台</h1>
          </div>
          <button className={styles.backBtn} onClick={onClose}>← 返回战术板</button>
        </div>

        {!authed ? (
          <div className={styles.loginBox}>
            <input type="password" className={styles.loginInput} placeholder="ADMIN_KEY" value={key}
              onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} />
            <button className={styles.loginBtn} onClick={handleLogin} disabled={loginLoading}>
              {loginLoading ? '验证中...' : '登录'}
            </button>
            {loginError && <div className={styles.loginError}>{loginError}</div>}
          </div>
        ) : (
          <div className={styles.navSection}>
            {([
              ['dashboard', '📊', '数据面板'],
              ['review', '📋', '审核中心'],
            ] as const).map(([id, icon, label]) => (
              <button key={id} className={`${styles.navItem} ${nav === id ? styles.navItemActive : ''}`} onClick={() => setNav(id)}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.04)', paddingTop: 12 }}>
              <button className={styles.navItem} onClick={handleLogout} style={{ color: 'rgba(255,85,85,.4)' }}>
                <span>🚪</span><span>退出登录</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 主内容区 */}
      <main className={styles.main}>
        {nav === 'dashboard' && <>
          <h2 className={styles.pageTitle}>📊 数据面板</h2>
          <p className={styles.pageSubtitle}>用户 · 内容 · 收入 · 系统状态</p>
          <Dashboard adminKey={adminKey} refreshTrigger={refreshK} />
        </>}

        {nav === 'review' && <>
          <h2 className={styles.pageTitle}>📋 审核中心</h2>
          <p className={styles.pageSubtitle}>数据采集 · AI洞察 · 用户贡献 · 对话日志</p>
          <ReviewCenter adminKey={adminKey} />
        </>}

        {/* 底部操作 */}
        <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,.03)', paddingTop: 16 }}>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => setRefreshK(k => k + 1)}>🔄 刷新全部</button>
            <button className={styles.actionBtn} onClick={async () => {
              const r = await fetch(`/api/admin/setup-storage?key=${encodeURIComponent(adminKey)}`)
              const d = await r.json()
              alert(d.ok ? 'Storage bucket 已就绪' : '失败')
            }}>📦 初始化 Storage</button>
          </div>
        </div>
      </main>
    </div>
  )
}
