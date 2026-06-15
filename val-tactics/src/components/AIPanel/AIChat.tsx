import { useState, useRef, useEffect } from 'react'
import { getAIConfig, getUserId } from './AISettings'
import { useTactics } from '../../store/TacticsContext'
import { buildKnowledgeBase, getAgentNames, formatBoardStateForAI, getInjectedInsightIds, markInsightsInjected, clearInjectedInsights } from '../../data/knowledgeBase'
import { loadMatches, formatMatchHistoryForAI, formatSingleMatchForAI } from '../../data/matchHistory'
import { loadMatchContext } from '../MatchHistory/MatchContextSelector'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { supabase } from '../../lib/supabase'
import styles from './AIPanel.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  model?: string
  convId?: string
  rating?: number
}

export default function AIChat({ mapId, mapName }: { mapId: string; mapName: string }) {
  const { abilityShapes, side, agentPositions, drawings, textAnnotations, markers, roster } = useTactics()
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
    const agentIds = abilityShapes
      .map(s => s.agentId)
      .filter((v, i, a) => a.indexOf(v) === i)
    const agentNames = getAgentNames(agentIds)

    const isCompact = config.model === 'deepseek-v4-flash' || config.model === 'deepseek-chat'
    const systemPrompt = buildKnowledgeBase(mapName, side, agentNames, isCompact)

    // ① 社区参考按问题类型筛选
    let communityRefs = ''
    try {
      const isTactics = /阵容|组合|搭配|双烟|双决斗|选什么|推荐|怎么打|进攻|防守|战术/.test(text)
      const isLineups = /点位|技能|位置|瞄点|怎么用|连招|道具|在哪/.test(text)
      const [tacRes, linRes] = await Promise.all([
        (isTactics || !isLineups) ? supabase.from('tactical_shares').select('title,description,map_id,like_count').eq('map_id', mapId).order('like_count', { ascending: false }).limit(3) : Promise.resolve(null),
        (isLineups || !isTactics) ? supabase.from('lineups').select('title,description,map_id,like_count,agent_id,ability_id').eq('map_id', mapId).order('like_count', { ascending: false }).limit(3) : Promise.resolve(null),
      ])
      const refs: string[] = []
      ;(tacRes?.data || []).forEach((t: any) => { if (t.title) refs.push(`战术「${t.title}」${t.description ? '：' + t.description.slice(0, 60) : ''} 👍${t.like_count || 0}`) })
      ;(linRes?.data || []).forEach((l: any) => {
        const a = agents.find(x => x.id === l.agent_id)
        const ab = a?.abilities.find(x => x.id === l.ability_id)
        refs.push(`点位「${l.title}」(${a?.name || l.agent_id} ${ab?.name || l.ability_id})${l.description ? '：' + l.description.slice(0, 40) : ''} 👍${l.like_count || 0}`)
      })
      console.debug(`[T教练·调试] 社区参考：查战术=${isTactics} 查点位=${isLineups} → tactics ${tacRes?.data?.length || 0}条 lineups ${linRes?.data?.length || 0}条`)
      if (refs.length > 0) communityRefs = `【社区相关参考·${maps.find(m => m.id === mapId)?.name || mapId}】\n${refs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    } catch {}

    // ②+⑥ 知识洞察交集匹配+时效排序
    let knowledgeRefs = ''
    try {
      const { data: insights } = await supabase.from('knowledge_insights')
        .select('id,category,content,source,created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(30)
      if (insights && insights.length > 0) {
        // ① 去重：排除本轮对话已注入的洞察
        const injectedIds = getInjectedInsightIds()
        const freshInsights = insights.filter((ins: any) => !injectedIds.has(ins.id))
        const mapKW = new Set<string>()
        mapKW.add(mapName.toLowerCase())
        for (const m of maps) { if (text.includes(m.name)) mapKW.add(m.name.toLowerCase()) }
        const tacKW = new Set<string>()
        const tacWords = ['进攻', '防守', 'A点', 'B点', 'C点', '中路', '阵容', '双烟', '双决斗', '速攻', '慢推', '转点', 'Rush', 'default', '狙击', '回防', '前压', 'ECO', '强起', '配合', '克制', '技能']
        for (const w of tacWords) { if (text.includes(w)) tacKW.add(w.toLowerCase()) }
        // 特工名同时算战术关键词
        for (const a of agents) { if (text.includes(a.name)) tacKW.add(a.name.toLowerCase()) }

        // 交集匹配
        let relevant = freshInsights.filter((ins: any) => {
          const h = ((ins.content || '') + (ins.category || '')).toLowerCase()
          const m = mapKW.size === 0 || Array.from(mapKW).some(k => h.includes(k))
          const t = tacKW.size === 0 || Array.from(tacKW).some(k => h.includes(k))
          return m && t
        })

        // ⑥ 时效性排序
        const now = Date.now()
        relevant.sort((a: any, b: any) => {
          const score = (ins: any) => {
            const age = now - new Date(ins.created_at).getTime()
            let s = 0
            if (ins.source === 'vct') s += 30
            if (ins.source === 'wiki') s += 15
            if (age < 30 * 86400000) s += 20
            if (ins.source === 'version' && age > 90 * 86400000) s -= 20
            return s
          }
          return score(b) - score(a)
        })

        if (relevant.length < 3) relevant = freshInsights.slice(0, 5)
        relevant = relevant.slice(0, 10)

        console.debug(`[T教练·调试] 知识洞察：地图KW[${Array.from(mapKW).join(',')}] 战术KW[${Array.from(tacKW).join(',')}] 拉取${insights.length}→去重后${freshInsights.length}→交集匹配${relevant.length}→TOP10排序`)

        if (relevant.length > 0) {
          knowledgeRefs = `【已入库的职业战术数据·匹配${relevant.length}条】（以下是与当前问题最相关的战术知识，请优先引用）：\n\n${relevant.map((ins: any, i: number) => `${i + 1}. [${ins.source || '未知来源'}] ${ins.content.slice(0, 500)}`).join('\n\n')}`
          // ① 标记已注入，后续消息不再重复
          markInsightsInjected(relevant.map((ins: any) => ins.id))
        }
      }
    } catch {}

    // 棋盘实时状态
    let boardState = ''
    const showBoard = (() => { try { return localStorage.getItem('val-tactics-show-board-info') !== 'false' } catch { return true } })()
    if (showBoard) boardState = formatBoardStateForAI(mapName, side, agentPositions, abilityShapes, drawings, textAnnotations, markers, roster)

    // 对局前置信息
    let matchInfo = ''
    const preMap = localStorage.getItem('val-tactics-pre-map') || ''
    const ally = (() => { try { return JSON.parse(localStorage.getItem('val-tactics-ally-roster') || '[]') } catch { return [] } })()
    const enemy = (() => { try { return JSON.parse(localStorage.getItem('val-tactics-enemy-roster') || '[]') } catch { return [] } })()
    if (preMap || ally.length > 0 || enemy.length > 0) {
      const lines: string[] = []
      if (preMap) { const m = maps.find(x => x.id === preMap); if (m) lines.push(`地图：${m.name}`) }
      if (ally.length > 0) lines.push(`我方阵容：${ally.map((id: string) => agents.find(a => a.id === id)?.name || id).join('、')}`)
      if (enemy.length > 0) lines.push(`敌方阵容：${enemy.map((id: string) => agents.find(a => a.id === id)?.name || id).join('、')}`)
      matchInfo = '【用户补充的对局信息】\n' + lines.map(l => `- ${l}`).join('\n')
    }

    // 比赛数据
    let matchData = ''
    const ctx = loadMatchContext()
    if (ctx.mode !== 'none') {
      const matches = loadMatches()
      if (matches.length > 0) {
        matchData = ctx.mode === 'single' && ctx.matchId
          ? `以下是我选定的一场比赛数据：\n\n${formatSingleMatchForAI(matches.find(m => m.id === ctx.matchId)!)}`
          : `以下是我的全部比赛数据：\n\n${formatMatchHistoryForAI(matches)}`
      }
    }

    // ⑦ 所有上下文合并为一条消息
    const blocks: string[] = []
    if (knowledgeRefs) blocks.push(knowledgeRefs)
    if (communityRefs) blocks.push(communityRefs)
    if (boardState) blocks.push(boardState)
    if (matchInfo) blocks.push(matchInfo)
    if (matchData) blocks.push(matchData)

    // ④ 长对话截断：超过10轮只保留最近10轮
    const MAX_ROUNDS = 10
    const recentMsgs = msgs.length > MAX_ROUNDS * 2
      ? [{ role: 'user' as const, content: '（前文已截断，以下继续）' },
         { role: 'assistant' as const, content: '明白。' },
         ...msgs.slice(-MAX_ROUNDS * 2)]
      : msgs

    const allMessages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: '明白。我是T教练，已掌握全部29位特工技能数据和12张地图信息，请随时提问。' },
      ...(blocks.length ? [
        { role: 'user' as const, content: '【综合上下文】\n\n' + blocks.join('\n\n---\n\n') },
        { role: 'assistant' as const, content: '收到，我已了解全部上下文。' },
      ] : []),
      ...recentMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
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

      // 存到 Supabase
      let convId: string | undefined
      try {
        const { data: row } = await supabase.from('ai_conversations').insert({
          question: text, answer: content, model: config.model,
        }).select('id').single()
        convId = row?.id
      } catch {}
      setMessages(prev => [...prev, { role: 'assistant', content, model: config.model, convId, rating: 0 }])
      // 匿名上报对话日志（含对局上下文）
      void fetch('/api/log/conversation', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userHash: getUserId(), model: config.model,
          messages: [{ role: 'user', content: text }, { role: 'assistant', content }],
          context: {
            mapId, mapName, side,
            roster: { attack: roster.attack?.join(','), defense: roster.defense?.join(',') },
            agents: agentPositions.map(a => a.agentId).filter((v, i, arr) => arr.indexOf(v) === i),
            ally: localStorage.getItem('val-tactics-ally-roster') || '',
            enemy: localStorage.getItem('val-tactics-enemy-roster') || '',
            preMap: localStorage.getItem('val-tactics-pre-map') || '',
          },
        }),
      }).catch(() => {})
      if (isFree) {
        const date = new Date().toISOString().slice(0,10)
        const k = `val-tactics-usage-${date}-${config.model}`
        const n = (parseInt(localStorage.getItem(k) || '0')) + 1
        localStorage.setItem(k, String(n))
      }
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
            {m.role === 'assistant' && m.convId && (
              <div style={{ display: 'flex', gap: 4, marginTop: 2, paddingLeft: 4 }}>
                <span onClick={async () => {
                  const nr = m.rating === 1 ? 0 : 1
                  setMessages(prev => prev.map(msg => msg.convId === m.convId ? { ...msg, rating: nr } : msg))
                  await supabase.from('ai_conversations').update({ rating: nr }).eq('id', m.convId!)
                }} style={{ cursor: 'pointer', fontSize: 14, opacity: m.rating === 1 ? 1 : .3 }}>👍</span>
                <span onClick={async () => {
                  const nr = m.rating === -1 ? 0 : -1
                  setMessages(prev => prev.map(msg => msg.convId === m.convId ? { ...msg, rating: nr } : msg))
                  await supabase.from('ai_conversations').update({ rating: nr }).eq('id', m.convId!)
                }} style={{ cursor: 'pointer', fontSize: 14, opacity: m.rating === -1 ? 1 : .3 }}>👎</span>
              </div>
            )}
          </div>
        ))}
        {loading && <div className={styles.loading}><span>●</span><span>●</span><span>●</span></div>}
      </div>

      <div className={styles.inputArea}>
        <input className={styles.chatInput} value={input}
          placeholder="问战术..."
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button
          onClick={() => { setMessages([]); localStorage.removeItem('val-tactics-chat'); clearInjectedInsights() }}
          style={{
            padding: '6px 8px', background: 'transparent',
            border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
            color: 'rgba(255,255,255,.25)', fontSize: 11, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >重置</button>
        <button className={styles.sendBtn} onClick={send} disabled={loading}>
          {loading ? '⏳' : '发送'}
        </button>
      </div>
    </div>
  )
}
