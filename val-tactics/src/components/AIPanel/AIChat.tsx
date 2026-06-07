import { useState, useRef, useEffect } from 'react'
import { getAIConfig, getUserId } from './AISettings'
import { useTactics } from '../../store/TacticsContext'
import agents from '../../data/agents'
import styles from './AIPanel.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
}

// 知识库：系统提示词
function buildSystemPrompt(
  mapName: string, side: string,
  agentNames: string[], shapeCount: number
): string {
  let prompt = `你是一个无畏契约(VALORANT)战术教练助手。你正在帮用户在「${mapName}」这张地图上布置${side === 'attack' ? '进攻' : '防守'}战术。

目前地图上有 ${shapeCount} 个技能标记。`

  if (agentNames.length > 0) {
    prompt += `\n场上特工: ${agentNames.join('、')}。`
  }

  prompt += `
请用中文回答。回答简洁实用，像教练一样给出建议。

关于无畏契约的知识：
- 12 张地图: 亚海悬城、源工重镇、森寒冬港、霓虹町、深海明珠、裂变峡谷、隐士修所、日落之城、莲华古城、微风岛屿、幽邃地窖、盐海矿镇
- 29 个特工分四个角色: 决斗者(进点)、先锋(信息)、控场者(烟雾)、哨卫(防守)
- 每个特工有 C/Q/E/X 四个技能`

  return prompt
}

export default function AIChat({ mapName }: { mapId: string; mapName: string }) {
  const { abilityShapes, side } = useTactics()
  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem('val-tactics-chat') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 持久化消息
  useEffect(() => { localStorage.setItem('val-tactics-chat', JSON.stringify(messages)) }, [messages])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const config = getAIConfig()
    const isFree = !config.apiKey
    if (!config.apiKey && !isFree) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ 请先填入 API Key 或使用免费模式。' }])
      return
    }

    if (!config.model) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ 请先选择一个模型。' }])
      return
    }

    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text }
    const msgs = [...messages, userMsg]
    setMessages(msgs)

    // 获取当前上下文
    const agentNames = abilityShapes
      .map(s => agents.find(a => a.id === s.agentId)?.name)
      .filter((v): v is string => !!v)
      .filter((v, i, a) => a.indexOf(v) === i)

    const systemPrompt = buildSystemPrompt(mapName, side, agentNames, abilityShapes.length)

    const allMessages = [
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: '明白了，我会根据当前战术布局给出建议。' },
      ...msgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    try {
      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          provider: config.provider,
          model: config.model,
          userId: isFree ? getUserId() : undefined,
          messages: allMessages,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
        throw new Error(err.error || `请求失败 (${resp.status})`)
      }

      const data = await resp.json().catch(() => {
        throw new Error('无法解析 AI 响应，请检查 API Key 和网络')
      })

      let content = ''
      if (config.provider === 'anthropic') {
        content = data.content?.[0]?.text || JSON.stringify(data)
      } else if (config.provider === 'google') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
      } else {
        content = data.choices?.[0]?.message?.content || JSON.stringify(data)
      }

      setMessages(prev => [...prev, { role: 'assistant', content, model: config.model }])
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ 网络连接失败' }])
      } else if (msg.includes('401') || msg.includes('403')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ API Key 无效' }])
      } else if (msg.includes('model') || msg.includes('404')) {
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ 模型名无效，请检查' }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg || '请求失败'}` }])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="72" height="72">
                <defs><linearGradient id="aiLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
                <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#aiLogoGrad)" strokeWidth="2" transform="rotate(-12,37,39)"/>
                <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#aiLogoGrad)" opacity="0.25" transform="rotate(5,53,35)"/>
                <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#aiLogoGrad)" strokeWidth="2" transform="rotate(-3,44,54)"/>
                <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#aiLogoGrad)" opacity="0.35" transform="rotate(10,61,51)"/>
                <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#aiLogoGrad)" strokeWidth="2" transform="rotate(-8,74,68)"/>
                <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
              </svg>
            </div>
            <p>你好尊敬的选手，我是T教练，我能解答你所有关于无畏契约的疑问</p>
            <div className={styles.quickPrompts}>
              {['这张地图怎么打 B 点？', '推荐一个进攻阵容', '分析我现在的战术布局', '怎么破解双烟防守？'].map((p, i) => (
                <button key={i} className={styles.quickBtn} onClick={() => { setInput(p) }}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
            <div className={styles.msgBubble}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className={styles.loading}><span>●</span><span>●</span><span>●</span></div>}
      </div>

      <div className={styles.inputArea}>
        <input className={styles.chatInput} value={input}
          placeholder="问战术..."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className={styles.sendBtn} onClick={send} disabled={loading}>
          {loading ? '⏳' : '发送'}
        </button>
      </div>
    </div>
  )
}
