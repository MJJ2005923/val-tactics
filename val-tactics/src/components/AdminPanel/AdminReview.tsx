import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { setAdminKey, clearAdminKey, getAdminKey, approveInsight, approveContribution } from '../../lib/adminAuth'
import styles from './AdminPanel.module.css'

interface Props { onClose: () => void }

export default function AdminReview({ onClose }: Props) {
  // 登录状态
  const [key, setKey] = useState(() => getAdminKey() || '')
  const [authed, setAuthed] = useState(() => !!getAdminKey())
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // 审核数据
  const [tab, setTab] = useState<'insights' | 'contributions' | 'conversations'>('insights')
  const [insights, setInsights] = useState<any[]>([])
  const [contributions, setContributions] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [convPage, setConvPage] = useState(0)
  const [loading, setLoading] = useState(false)

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
        loadAll()
      } else {
        const d = await resp.json().catch(() => ({}))
        setLoginError((d as any).error || '密钥错误')
      }
    } catch {
      setLoginError('网络错误，请重试')
    }
    setLoginLoading(false)
  }

  const loadAll = async () => {
    setLoading(true)
    const [ir, cr, cvr] = await Promise.all([
      supabase.from('knowledge_insights').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
      supabase.from('knowledge_contributions').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(30),
      supabase.from('conversation_logs').select('*').eq('role', 'user').order('created_at', { ascending: false }).range(convPage * 20, (convPage + 1) * 20 - 1),
    ])
    setInsights((ir.data || []) as any[])
    setContributions((cr.data || []) as any[])
    setConversations((cvr.data || []) as any[])
    setLoading(false)
  }

  useEffect(() => {
    if (authed) loadAll()
  }, [convPage, authed])

  const handleInsight = async (id: string, status: string) => {
    await approveInsight(id, status as 'approved' | 'rejected')
    setInsights(prev => prev.filter(i => i.id !== id))
  }

  const handleContribution = async (id: string, status: string) => {
    await approveContribution(id, status as 'approved' | 'rejected')
    setContributions(prev => prev.filter(i => i.id !== id))
  }

  const distillOne = async (convId: string) => {
    const conv = conversations.find(c => c.id === convId)
    if (!conv?.content) return alert('无对话内容')
    try {
      const resp = await fetch('/api/admin/distill', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: adminKey, conversationContent: conv.content }),
      })
      const d = await resp.json()
      alert(d.ok ? '蒸馏完成' : '失败')
      loadAll()
    } catch { alert('网络错误') }
  }

  const sourceLabels: Record<string, string> = { wiki: 'Wiki', vct: 'VCT', version: '版本', conversation: '对话', user: '用户' }

  const btnStyle = (active: boolean) => ({
    padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: '8px 8px 0 0',
    background: active ? 'rgba(5,248,248,.08)' : 'none', color: active ? '#05F8F8' : 'rgba(255,255,255,.3)',
    cursor: 'pointer', fontFamily: 'inherit',
  })

  const actionBtn = (color: string, text: string, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${color}`, background: 'none', color, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>{text}</button>
  )

  // 未登录 → 显示登录界面
  if (!authed) {
    return (
      <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2>🔐 管理员登录</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.loginArea}>
            <input type="password" className={styles.keyInput} placeholder="输入 ADMIN_KEY" value={key}
              onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleLogin() }} />
            <button className={styles.loginBtn} onClick={handleLogin} disabled={loginLoading}>{loginLoading ? '验证中...' : '进入'}</button>
            {loginError && <p className={styles.error}>{loginError}</p>}
          </div>
        </div>
      </div>
    )
  }

  // 已登录 → 审核界面
  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.panel} style={{ maxWidth: 700 }}>
        <div className={styles.header}>
          <h2>📋 审核中心</h2>
          <div style={{ flex: 1 }} />
          <button onClick={() => { clearAdminKey(); setAuthed(false); setKey('') }}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,85,85,.2)', background: 'none', color: 'rgba(255,85,85,.6)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
            退出
          </button>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 0, flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            {(['insights', 'contributions', 'conversations'] as const).map(t => (
              <button key={t} style={btnStyle(tab === t)} onClick={() => setTab(t)}>
                {t === 'insights' ? `AI洞察 (${insights.length})` : t === 'contributions' ? `用户贡献 (${contributions.length})` : `对话日志`}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button style={{ ...btnStyle(false), fontSize: 10 }} onClick={loadAll}>🔄 刷新</button>
          </div>

          {loading && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 20 }}>加载中...</div>}

          {/* AI 洞察审核 */}
          {tab === 'insights' && (insights.length === 0
            ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 20 }}>暂无待审洞察</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {insights.map(i => (
                <div key={i.id} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.03)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 10, flexShrink: 0 }}>[{sourceLabels[i.source] || i.source}]</span>
                  <span style={{ color: 'rgba(255,255,255,.5)', flex: 1 }}>{i.content}</span>
                  {actionBtn('rgba(5,248,248,.4)', '✓', () => handleInsight(i.id, 'approved'))}
                  {actionBtn('rgba(255,85,85,.4)', '✕', () => handleInsight(i.id, 'rejected'))}
                </div>
              ))}
            </div>
          )}

          {/* 用户贡献审核 */}
          {tab === 'contributions' && (contributions.length === 0
            ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 20 }}>暂无待审贡献</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {contributions.map(c => (
                <div key={c.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.03)', fontSize: 12 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: '#05F8F8', fontSize: 10 }}>[{c.category}]</span>
                    <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 10 }}>{c.user_id?.slice(0, 8)}</span>
                    {c.source && <span style={{ color: 'rgba(255,255,255,.1)', fontSize: 9 }}>来源: {c.source}</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>{c.content}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {actionBtn('rgba(5,248,248,.4)', '✓ 通过入库', () => handleContribution(c.id, 'approved'))}
                    {actionBtn('rgba(255,85,85,.4)', '✕ 拒绝', () => handleContribution(c.id, 'rejected'))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 对话日志 */}
          {tab === 'conversations' && (conversations.length === 0
            ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,.1)', textAlign: 'center', padding: 20 }}>暂无对话</div>
            : <>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <button onClick={() => setConvPage(p => Math.max(0, p - 1))} style={{ ...btnStyle(false), fontSize: 10 }}>上一页</button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', padding: '4px 8px' }}>第 {convPage + 1} 页</span>
                <button onClick={() => setConvPage(p => p + 1)} style={{ ...btnStyle(false), fontSize: 10 }}>下一页</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {conversations.map(c => {
                  let ctx: any = null
                  try { ctx = c.context ? (typeof c.context === 'string' ? JSON.parse(c.context) : c.context) : null } catch {}
                  return (
                    <div key={c.id} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.03)', fontSize: 12 }}>
                      <div style={{ color: 'rgba(255,255,255,.5)', marginBottom: 4, lineHeight: 1.5 }}>{c.content.slice(0, 200)}</div>
                      {ctx && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4, fontSize: 10 }}>
                          {ctx.mapName && <span style={{ color: '#05F8F8' }}>🗺 {ctx.mapName}</span>}
                          {ctx.side && <span style={{ color: ctx.side === 'attack' ? '#ff4655' : '#50b4f0' }}>{ctx.side === 'attack' ? '进攻' : '防守'}</span>}
                          {ctx.ally && <span style={{ color: 'rgba(255,255,255,.2)' }}>我方: {ctx.ally}</span>}
                          {ctx.enemy && <span style={{ color: 'rgba(255,255,255,.2)' }}>敌方: {ctx.enemy}</span>}
                          {ctx.agents?.length > 0 && <span style={{ color: 'rgba(255,255,255,.2)' }}>特工: {ctx.agents.join(', ')}</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,.1)', fontSize: 10 }}>{new Date(c.created_at).toLocaleString('zh')}</span>
                        {actionBtn('rgba(227,73,237,.4)', '⚡ 蒸馏', () => distillOne(c.id))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
