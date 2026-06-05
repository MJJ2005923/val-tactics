import { useState, useRef, useEffect, useCallback } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './AIPage.module.css'

interface Message { role: 'user' | 'assistant'; content: string }
interface AIModel { id: string; name: string; tier?: string; perf?: string }
interface AIConfig { apiKey: string; provider: string; model: string }

const API_BASE = '/api'
const PROVIDER = 'deepseek' // 后端固定用 DeepSeek

function uid() {
  let id = localStorage.getItem('val-tactics-uid')
  if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }
  return id
}
function loadConfig() {
  try { const raw = localStorage.getItem('val-tactics-ai-config'); if (raw) return JSON.parse(raw) } catch {}
  return { apiKey: '', provider: PROVIDER, model: '' }
}
function saveConfig(c: AIConfig) { localStorage.setItem('val-tactics-ai-config', JSON.stringify(c)) }

function buildSystemPrompt(mapName: string, side: string, agentNames: string[], shapeCount: number) {
  return `你是一个无畏契约战术教练。当前地图「${mapName}」，${side === 'attack' ? '进攻方' : '防守方'}。地图上有 ${shapeCount} 个技能标记。${agentNames.length > 0 ? `场上特工: ${agentNames.join('、')}。` : ''}请用中文回答，简洁实用，像教练一样。`
}

export default function AIPage({ mapName, onBack }: { mapId: string; mapName: string; onBack: () => void }) {
  const { abilityShapes, side } = useTactics()
  const [config, setConfig] = useState(loadConfig)
  const [models, setModels] = useState<AIModel[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isFree = !config.apiKey

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  useEffect(() => { saveConfig(config) }, [config])

  const fetchModels = useCallback(async () => {
    try {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(`${API_BASE}/models`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: PROVIDER }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (resp.ok) {
        const data = await resp.json()
        if (data.models?.length > 0) {
          setModels(data.models)
          if (!config.model || !data.models.find((m: AIModel) => m.id === config.model)) {
            setConfig((c: AIConfig) => ({ ...c, model: data.models[0].id }))
          }
        }
      }
    } catch { /* ok */ }
  }, [config.apiKey])

  const saveKey = () => {
    setConfig((c: AIConfig) => ({ ...c, apiKey: keyInput }))
    setShowKeyInput(false)
    setTimeout(() => fetchModels(), 100)
  }

  useEffect(() => { fetchModels() }, [fetchModels])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!isFree && !config.apiKey) { setShowKeyInput(true); return }
    if (!config.model) return

    setInput(''); setLoading(true)
    const msgs = [...messages, { role: 'user' as const, content: text }]
    setMessages(msgs)

    const agentNames = abilityShapes
      .map(s => agents.find(a => a.id === s.agentId)?.name)
      .filter((v): v is string => !!v)
      .filter((v, i, a) => a.indexOf(v) === i)

    const allMessages = [
      { role: 'user', content: buildSystemPrompt(mapName, side, agentNames, abilityShapes.length) },
      { role: 'assistant', content: '明白了。' },
      ...msgs,
    ]

    try {
      const resp = await fetch(`${API_BASE}/ai`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: PROVIDER, model: config.model, messages: allMessages, userId: isFree ? uid() : undefined }),
      })
      const data = await resp.json()
      if (resp.status === 429 && data.error === 'free_limit') {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.message}` }])
      } else if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`)
      else {
        const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content
          || data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
        setMessages(prev => [...prev, { role: 'assistant', content }])
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Failed to fetch')) setMessages(prev => [...prev, { role: 'assistant', content: '❌ 网络连接失败' }])
      else if (msg.includes('401') || msg.includes('403')) setMessages(prev => [...prev, { role: 'assistant', content: '❌ 服务暂不可用' }])
      else setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg || '请求失败'}` }])
    } finally { setLoading(false) }
  }

  const quickPrompts = [
    '分析我现在的战术布局有什么问题',
    '推荐一个适合这张地图的进攻阵容',
    '怎么防守 B 点？给三个方案',
    '当前版本最强的双烟组合是什么',
  ]

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>⚡ AI 战术教练</h1>
          <button className={styles.backBtn} onClick={onBack}>← 返回战术板</button>
        </div>

        <div className={styles.sidebarSection}>
          <h3>智能模式</h3>
          {models.length > 0 ? (
            <div className={styles.modelList}>
              {models.map(m => {
                const isFreeModel = m.tier === '免费可用'
                const locked = isFreeModel ? false : isFree
                return (
                  <button key={m.id}
                    className={`${styles.modelCard} ${config.model === m.id ? styles.modelCardActive : ''} ${locked ? styles.modelCardLocked : ''}`}
                    style={{ borderColor: config.model === m.id ? '#ff4655' : 'transparent' }}
                    onClick={() => !locked && setConfig((c: AIConfig) => ({ ...c, model: m.id }))}>
                    <div className={styles.modelName}>
                      {m.name}
                      {isFreeModel && <span className={styles.freeBadge}>免费</span>}
                      {locked && <span className={styles.lockBadge}>🔒 付费</span>}
                    </div>
                    {m.perf && <div className={styles.modelPerf}>{m.perf}</div>}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className={styles.hint}>加载中...</p>
          )}
        </div>

        {isFree ? (
          <div className={styles.sidebarSection}>
            <div className={styles.freeBanner}>🎉 免费使用 · 快速模式 · 每天 3 次</div>
            <button className={styles.keyBtn} onClick={() => setShowKeyInput(!showKeyInput)}>
              🔑 自备 Key 解锁全部模式
            </button>
            {showKeyInput && (
              <div className={styles.keyEdit} style={{ marginTop: 8 }}>
                <input className={styles.keyInput} type="password" value={keyInput}
                  placeholder="粘贴 API Key..." onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveKey() }} />
                <button className={styles.keySaveBtn} onClick={saveKey}>确认</button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.sidebarSection}>
            <div className={styles.freeBanner} style={{ background: 'rgba(255,70,85,0.08)', borderColor: 'rgba(255,70,85,0.2)', color: '#ff4655' }}>
              🔑 自备 Key · 全部模式已解锁
            </div>
            <button className={styles.keyBtn} onClick={() => { setConfig((c: AIConfig) => ({ ...c, apiKey: '' })); setModels([]); setTimeout(() => fetchModels(), 100) }}>
              ← 切换回免费模式
            </button>
          </div>
        )}

        <div className={styles.sidebarSection}>
          <h3>当前</h3>
          <div className={styles.context}>
            <span>🗺️ {mapName}</span>
            <span>⚔️ {side === 'attack' ? '进攻方' : '防守方'}</span>
            <span>📐 {abilityShapes.length} 技能</span>
          </div>
        </div>
      </aside>

      <main className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <span className={styles.chatModel}>⚡ AI 战术教练{config.model ? ` · ${models.find(m => m.id === config.model)?.name || ''}` : ''}</span>
          <span className={styles.chatStatus}>{isFree ? '🆓 免费模式' : '🔓 已解锁'}</span>
        </div>
        <div className={styles.messages} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>⚡</div>
              <h2>AI 战术教练</h2>
              <p>{isFree ? '免费使用快速模式，每天 3 次。输入 Key 解锁全部智能模式。' : '已解锁全部智能模式，尽情使用。'}试试问我：</p>
              <div className={styles.quickPrompts}>
                {quickPrompts.map((p, i) => (
                  <button key={i} className={styles.quickBtn} onClick={() => { setInput(p); inputRef.current?.focus() }}>{p}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
                <div className={styles.msgAvatar}>{m.role === 'user' ? '👤' : '⚡'}</div>
                <div className={styles.msgContent}>{m.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className={styles.aiMsg}>
              <div className={styles.msgAvatar}>⚡</div>
              <div className={styles.msgContent}><span className={styles.typing}>分析中</span></div>
            </div>
          )}
        </div>
        <div className={styles.inputBar}>
          <input ref={inputRef} className={styles.chatInput}
            value={input}
            placeholder={config.model ? '输入你的战术问题...' : '请先在左侧选择智能模式'}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button className={styles.sendBtn} onClick={send} disabled={loading || !input.trim() || !config.model}>发送</button>
        </div>
      </main>
    </div>
  )
}
