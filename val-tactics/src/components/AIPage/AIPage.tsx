import { useState, useRef, useEffect, useCallback } from 'react'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './AIPage.module.css'

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', color: '#d4a574', hint: '去 console.anthropic.com 获取' },
  { id: 'openai', name: 'OpenAI', icon: '⚡', color: '#74aa9c', hint: '去 platform.openai.com 获取' },
  { id: 'google', name: 'Google', icon: '🌐', color: '#8ab4f8', hint: '去 aistudio.google.com 获取' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🐋', color: '#4f6ef7', hint: '去 platform.deepseek.com 获取' },
]

interface Message { role: 'user' | 'assistant'; content: string }
interface AIModel { id: string; name: string }
interface AIConfig { apiKey: string; provider: string; model: string }

// Worker 地址（本地用 localhost:8787，部署后改成实际地址）
const API_BASE = '/api'

function loadConfig() {
  try {
    const raw = localStorage.getItem('val-tactics-ai-config')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { apiKey: '', provider: 'anthropic', model: '' }
}
function saveConfig(c: { apiKey: string; provider: string; model: string }) {
  localStorage.setItem('val-tactics-ai-config', JSON.stringify(c))
}

function buildSystemPrompt(mapName: string, side: string, agentNames: string[], shapeCount: number) {
  return `你是一个无畏契约战术教练。当前地图「${mapName}」，${side === 'attack' ? '进攻方' : '防守方'}。地图上有 ${shapeCount} 个技能标记。${agentNames.length > 0 ? `场上特工: ${agentNames.join('、')}。` : ''}请用中文回答，简洁实用，像教练一样。`
}

export default function AIPage({ mapName, onBack }: { mapId: string; mapName: string; onBack: () => void }) {
  const { abilityShapes, side } = useTactics()
  const [config, setConfig] = useState(loadConfig)
  const [providerId, setProviderId] = useState(config.provider)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const provider = PROVIDERS.find(p => p.id === providerId)!

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  useEffect(() => { saveConfig(config) }, [config])

  // 填 Key 后自动拉取模型列表
  const fetchModels = useCallback(async () => {
    if (!config.apiKey) return
    setLoadingModels(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: config.provider }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (resp.ok) {
        const data = await resp.json()
        if (data.models?.length > 0) {
          setModels(data.models)
          // 自动选第一个
          if (!config.model || !data.models.find((m: AIModel) => m.id === config.model)) {
            setConfig((c: AIConfig) => ({ ...c, model: data.models[0].id }))
          }
        }
      }
    } catch (e) { console.error('拉取模型失败:', e) }
    finally { setLoadingModels(false) }
  }, [config.apiKey, config.provider, config.model])

  const saveKey = () => {
    setConfig((c: AIConfig) => ({ ...c, apiKey: keyInput, provider: providerId }))
    setTimeout(() => fetchModels(), 100)
  }

  const selectModel = (modelId: string) => {
    setConfig((c: AIConfig) => ({ ...c, model: modelId }))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!config.apiKey || !config.model) return

    setInput('')
    setLoading(true)
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
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: config.provider, model: config.model, messages: allMessages }),
      })
      if (!resp.ok) throw new Error(`请求失败 (${resp.status})`)
      const data = await resp.json()
      const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content
        || data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ 网络连接失败，请检查网络或稍后重试。' }])
      } else if (msg.includes('401') || msg.includes('403')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ API Key 无效或已过期，请检查后重新输入。' }])
      } else if (msg.includes('404') || msg.includes('model')) {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ 模型 "${config.model}" 不存在或不可用。请在左侧切换模型后重试。` }])
      } else if (msg.includes('429')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ API 调用频率超限，请稍后重试。' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg || '请求失败，请检查 API Key 和模型名是否正确'}` }])
      }
    } finally {
      setLoading(false)
    }
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
          <h1 className={styles.logo}>🤖 AI 战术教练</h1>
          <button className={styles.backBtn} onClick={onBack}>← 返回战术板</button>
        </div>

        {/* 厂商选择 */}
        <div className={styles.sidebarSection}>
          <h3>选择厂商</h3>
          <div className={styles.providerTabs}>
            {PROVIDERS.map(p => (
              <button key={p.id}
                className={`${styles.providerTab} ${providerId === p.id ? styles.providerTabActive : ''}`}
                onClick={() => { setProviderId(p.id); setConfig((c: AIConfig) => ({ ...c, provider: p.id, model: '' })); setModels([]) }}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className={styles.sidebarSection}>
          <h3>API Key</h3>
          <div className={styles.keyEdit}>
            <input className={styles.keyInput} type="password" value={keyInput}
              placeholder="粘贴你的 API Key..."
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveKey() }} />
            <button className={styles.keySaveBtn} onClick={saveKey}>确认</button>
          </div>
          <p className={styles.keyHint}>{provider.hint} · Key 只存在你的浏览器里</p>
        </div>

        {/* 模型列表 — 自动发现 + 手动输入 */}
        {config.apiKey && (
          <div className={styles.sidebarSection}>
            <h3>选择模型 {loadingModels && <span className={styles.loadingHint}>检测中...</span>}</h3>
            {models.length > 0 && (
              <div className={styles.modelList}>
                {models.map(m => (
                  <button key={m.id}
                    className={`${styles.modelCard} ${config.model === m.id ? styles.modelCardActive : ''}`}
                    style={{ borderColor: config.model === m.id ? provider.color : 'transparent' }}
                    onClick={() => selectModel(m.id)}>
                    <div className={styles.modelName}>{m.name || m.id}</div>
                    <div className={styles.modelId}>{m.id}</div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <input className={styles.keyInput}
                value={config.model}
                placeholder="或手动输入模型名，如 deepseek-chat"
                onChange={e => setConfig((c: AIConfig) => ({ ...c, model: e.target.value }))} />
            </div>
          </div>
        )}

        {/* 上下文 */}
        <div className={styles.sidebarSection}>
          <h3>当前上下文</h3>
          <div className={styles.context}>
            <span>🗺️ {mapName}</span>
            <span>⚔️ {side === 'attack' ? '进攻方' : '防守方'}</span>
            <span>📐 {abilityShapes.length} 个技能</span>
          </div>
        </div>
      </aside>

      <main className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <span className={styles.chatModel}>{provider.icon} {provider.name}{config.model ? ` · ${config.model}` : ''}</span>
          {config.apiKey && config.model && <span className={styles.chatStatus}>● 就绪</span>}
        </div>

        <div className={styles.messages} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>🤖</div>
              <h2>你好！我是你的 AI 战术教练</h2>
              <p>我可以帮你分析战术、推荐阵容、解答疑问。试试问我：</p>
              <div className={styles.quickPrompts}>
                {quickPrompts.map((p, i) => (
                  <button key={i} className={styles.quickBtn} onClick={() => { setInput(p); inputRef.current?.focus() }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
                <div className={styles.msgAvatar}>{m.role === 'user' ? '👤' : provider.icon}</div>
                <div className={styles.msgContent}>{m.content}</div>
              </div>
            ))
          )}
          {loading && (
            <div className={styles.aiMsg}>
              <div className={styles.msgAvatar}>{provider.icon}</div>
              <div className={styles.msgContent}><span className={styles.typing}>思考中</span></div>
            </div>
          )}
        </div>

        <div className={styles.inputBar}>
          <input ref={inputRef} className={styles.chatInput}
            value={input}
            placeholder={config.apiKey && config.model ? '输入你的战术问题...' : '请先在左侧设置 API Key 和模型'}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button className={styles.sendBtn} onClick={send} disabled={loading || !input.trim() || !config.model}>
            发送
          </button>
        </div>
      </main>
    </div>
  )
}
