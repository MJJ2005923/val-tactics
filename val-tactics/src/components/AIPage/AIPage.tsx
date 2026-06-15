import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTactics } from '../../store/TacticsContext'
import { buildKnowledgeBase, getAgentNames, formatBoardStateForAI, formatMatchStateForAI, extractNegatedKeywords, buildTruncationSummary, getDynamicQuickPrompts, getInjectedInsightIds, markInsightsInjected, clearInjectedInsights } from '../../data/knowledgeBase'
import { loadMatches, formatMatchHistoryForAI, formatSingleMatchForAI } from '../../data/matchHistory'
import MatchContextSelector, { loadMatchContext } from '../MatchHistory/MatchContextSelector'
import RosterPicker from '../AIPanel/RosterPicker'
import maps from '../../data/maps'
import agents from '../../data/agents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/AuthContext'
import { encryptKey, decryptKey } from '../../utils/crypto'
import styles from './AIPage.module.css'

interface Message { role: 'user' | 'assistant'; content: string; convId?: string; rating?: number }
interface AIModel { id: string; name: string; tier?: string; perf?: string; limit?: string; unlock?: string }
interface AIConfig { apiKey: string; provider: string; model: string }

const API_BASE = '/api'
const PROVIDER = 'deepseek'

// 本地今日用量追踪（按模型分开计数）
const USAGE_DATE = new Date().toISOString().slice(0,10)
function usageKey(modelId?: string) { return `val-tactics-usage-${USAGE_DATE}${modelId ? `-${modelId}` : ''}` }
function getTodayUsage(modelId?: string): number {
  try { return parseInt(localStorage.getItem(usageKey(modelId)) || '0') } catch { return 0 }
}
function incrTodayUsage(modelId?: string): number {
  const k = usageKey(modelId)
  const n = getTodayUsage(modelId) + 1
  localStorage.setItem(k, String(n))
  return n
}
/** 共享池用量 = 基础模型总消耗 */
function getSharedUsage(): number {
  return getTodayUsage('deepseek-v4-flash') + getTodayUsage('deepseek-chat')
}

const PLANS = [
  { name: '免费', tier: 'free', detail: '快速模式 · 5 次 / 天', price: '¥0', color: '#05F8F8' },
  { name: '月付', tier: 'standard', detail: '全部 4 种模式 · 独立配额', price: '¥30/月', color: '#E349ED', period: 'month' as const, amount: 30 },
  { name: '季付', tier: 'standard', detail: '省 ¥15 · ¥25/月', price: '¥75/季', color: '#f0c0ff', period: 'quarter' as const, amount: 75 },
  { name: '年付', tier: 'standard', detail: '省 ¥72 · ¥24/月', price: '¥288/年', color: '#05F8F8', period: 'year' as const, amount: 288 },
]
import { ModelIcon } from '../ModelIcon'

/** 套餐专属 SVG 图标 — 方案A：几何徽章 */
function PlanIcon({ tier, color, size = 36 }: { tier: string; color: string; size?: number }) {
  const s = size
  // 免费 — 单层菱形
  if (tier === 'free') {
    return (
      <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
        <polygon points="18,5 31,18 18,31 5,18" fill={color} fillOpacity=".08" stroke={color} strokeWidth="1.2" strokeOpacity=".5"/>
        <polygon points="18,11 25,18 18,25 11,18" fill={color} fillOpacity=".1" stroke={color} strokeWidth="1" strokeOpacity=".4"/>
        <circle cx="18" cy="18" r="2.5" fill={color} opacity=".5"/>
      </svg>
    )
  }
  // 标准 — 三层菱形 + 粉青渐变
  if (tier === 'standard') {
    return (
    <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
      <defs>
        <linearGradient id={`proGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E349ED"/>
          <stop offset="100%" stopColor="#05F8F8"/>
        </linearGradient>
      </defs>
      <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="url(#proGrad)" strokeWidth=".7" opacity=".25"/>
      <polygon points="18,6 30,18 18,30 6,18" fill="url(#proGrad)" fillOpacity=".04" stroke="url(#proGrad)" strokeWidth="1" strokeOpacity=".4"/>
      <polygon points="18,10 26,18 18,26 10,18" fill="url(#proGrad)" fillOpacity=".06" stroke="url(#proGrad)" strokeWidth="1.2" strokeOpacity=".55"/>
      <polygon points="18,14 22,18 18,22 14,18" fill="url(#proGrad)" fillOpacity=".08" stroke="url(#proGrad)" strokeWidth=".8" strokeOpacity=".35"/>
      <polygon points="18,16 20,18 18,20 16,18" fill="url(#proGrad)" opacity=".12"/>
      <circle cx="18" cy="18" r="1.5" fill="#fff" opacity=".7"/>
      <circle cx="18" cy="2" r="1.2" fill="#fff" opacity=".25"/>
      <circle cx="34" cy="18" r="1.2" fill="#fff" opacity=".25"/>
      <circle cx="18" cy="34" r="1.2" fill="#fff" opacity=".25"/>
      <circle cx="2" cy="18" r="1.2" fill="#fff" opacity=".25"/>
    </svg>
  )
  }
  // 默认：标准图标
  return (
    <svg width={s} height={s} viewBox="0 0 36 36" fill="none">
      <polygon points="18,4 32,18 18,32 4,18" fill="none" stroke={color} strokeWidth="1" opacity=".3"/>
      <polygon points="18,10 26,18 18,26 10,18" fill={color} fillOpacity=".06" stroke={color} strokeWidth="1.2" strokeOpacity=".45"/>
      <circle cx="18" cy="18" r="2" fill={color} opacity=".55"/>
    </svg>
  )
}

// 套餐对应可用的模型
const TIER_MODELS: Record<string, string[]> = {
  free: ['deepseek-v4-flash'],
  standard: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro'],
}

// 每套餐总次数
const TIER_TOTAL_LIMITS: Record<string, number> = { free: 5, standard: 60 }

// 标准套餐按模型分拆日次数
const MODEL_LIMITS: Record<string, number> = {
  'deepseek-v4-flash': 20,
  'deepseek-chat': 10,
  'deepseek-reasoner': 5,
  'deepseek-v4-pro': 3,
}

async function activateCode(code: string): Promise<{ ok: boolean; tier?: string; error?: string; expiresAt?: number }> {
  try {
    const resp = await fetch('/api/activate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), userId: uid() }),
    })
    return await resp.json()
  } catch { return { ok: false, error: '网络请求失败' } }
}

function uid() {
  let id = localStorage.getItem('val-tactics-uid')
  if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }
  return id
}
function loadConfig() {
  try {
    const raw = localStorage.getItem('val-tactics-ai-config')
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj.apiKey) obj.apiKey = decryptKey(obj.apiKey, uid())
      return obj
    }
  } catch {}
  return { apiKey: '', provider: PROVIDER, model: '' }
}
function saveConfig(c: AIConfig) {
  const safe = { ...c }
  if (safe.apiKey) safe.apiKey = encryptKey(safe.apiKey, uid())
  localStorage.setItem('val-tactics-ai-config', JSON.stringify(safe))
}

export default function AIPage({ mapId, mapName, onBack, initialPrompt }: { mapId: string; mapName: string; onBack: () => void; initialPrompt?: string }) {
  const { abilityShapes, side, agentPositions, drawings, textAnnotations, markers, roster } = useTactics()
  const { user } = useAuth()

  // 未登录用户不能激活套餐
  const requireUser = (): boolean => {
    if (user) return true
    setActStatus('❌ 请先注册/登录账号后再激活套餐')
    return false
  }

  // 同步套餐到 Supabase（expiresAt 由后端返回，默认30天）
  const syncTierToSupabase = async (t: string, expiresAt?: number) => {
    if (!user) return
    const now = Date.now()
    await supabase.from('user_tiers').upsert({
      user_id: user.id,
      tier: t,
      activated_at: now,
      expires_at: t === 'free' ? 0 : expiresAt || now + 30 * 86400000,
      updated_at: new Date().toISOString(),
    })
  }
  const [config, setConfig] = useState(loadConfig)
  const [models, setModels] = useState<AIModel[]>([])
  const [messages, setMessages] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem('val-tactics-chat') || '[]') } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const [showBoardInfo, setShowBoardInfo] = useState(() => {
    try { return localStorage.getItem('val-tactics-show-board-info') !== 'false' } catch { return true }
  })
  const checkExpiry = (key: string) => {
    const ts = parseInt(localStorage.getItem(key) || '0')
    return ts && (Date.now() - ts) < 30 * 86400000
  }
  const [tier, setTier] = useState(() => {
    const stored = localStorage.getItem('val-tactics-tier')
    if (stored && stored !== 'free' && checkExpiry('val-tactics-tier-at')) return stored
    return 'free'
  })
  const [actCode, setActCode] = useState('')
  const [actStatus, setActStatus] = useState('')
  const [ownkeyActive, setOwnkeyActive] = useState(() => {
    if (localStorage.getItem('val-tactics-ownkey') !== '1') return false
    return checkExpiry('val-tactics-ownkey-at')
  })
  const activateOwnkey = () => {
    setOwnkeyActive(true)
    const now = Date.now()
    localStorage.setItem('val-tactics-ownkey', '1')
    localStorage.setItem('val-tactics-ownkey-at', String(now))
    setShowOwnkey(false)
    setActCode('')
    if (user) supabase.from('user_ownkey').upsert({ user_id: user.id, active: true, activated_at: now, expires_at: now + 30 * 86400000 })
  }
  const deactivateOwnkey = () => {
    setOwnkeyActive(false)
    localStorage.removeItem('val-tactics-ownkey')
    localStorage.removeItem('val-tactics-ownkey-at')
    if (user) supabase.from('user_ownkey').upsert({ user_id: user.id, active: false, activated_at: 0, expires_at: 0 })
  }
  const [showOwnkey, setShowOwnkey] = useState(false)
  const [todayUsed, setTodayUsed] = useState(() => getSharedUsage())
  const [showPlans, setShowPlans] = useState(false)
  const [showModels, setShowModels] = useState(true)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isFree = !config.apiKey && !ownkeyActive

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  useEffect(() => { localStorage.setItem('val-tactics-chat', JSON.stringify(messages)) }, [messages])
  useEffect(() => { saveConfig(config) }, [config])

  // AI 自动生成战术：收到 initialPrompt 后自动发送
  const autoSentRef = useRef(false)
  useEffect(() => {
    if (initialPrompt && config.model && !autoSentRef.current && !loading) {
      autoSentRef.current = true
      send(initialPrompt)
    }
  }, [initialPrompt, config.model, loading])

  // 登录时从 Supabase 恢复套餐
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data } = await supabase.from('user_tiers').select('tier, activated_at').eq('user_id', user.id).single()
        if (data && data.tier && data.tier !== 'free') {
          const ts = data.activated_at ? data.activated_at * 1000 : 0
          if (Date.now() - ts < 30 * 86400000) {
            setTier(data.tier)
            localStorage.setItem('val-tactics-tier', data.tier)
            localStorage.setItem('val-tactics-tier-at', String(ts))
          }
        }
      } catch {}
    })()

    // 恢复自备Key状态
    ;(async () => {
      try {
        const { data } = await supabase.from('user_ownkey').select('active, activated_at').eq('user_id', user.id).single()
        if (data && data.active) {
          const ts = data.activated_at ? data.activated_at * 1000 : 0
          if (Date.now() - ts < 30 * 86400000) {
            setOwnkeyActive(true)
            localStorage.setItem('val-tactics-ownkey', '1')
            localStorage.setItem('val-tactics-ownkey-at', String(ts))
          }
        }
      } catch {}
    })()
  }, [user])

  useEffect(() => {
    if (!isFree) setTier('free')
  }, [isFree])

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

  useEffect(() => { fetchModels() }, [fetchModels])

  const saveKey = () => {
    setConfig((c: AIConfig) => ({ ...c, apiKey: keyInput }))
    setTimeout(() => fetchModels(), 100)
  }

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim()
    if (!text || loading) return
    if (!isFree && !config.apiKey) return
    if (!config.model) return

    setInput(''); setLoading(true)
    const msgs = [...messages, { role: 'user' as const, content: text }]
    setMessages(msgs)

    const agentIds = abilityShapes
      .map(s => s.agentId)
      .filter((v, i, a) => a.indexOf(v) === i)
    const agentNames = getAgentNames(agentIds)
    const isCompact = config.model === 'deepseek-v4-flash' || config.model === 'deepseek-chat'

    // ③ 提取否定关键词
    const negatedKW = extractNegatedKeywords(text)

    // ① 社区参考按问题类型筛选
    let communityRefs = ''
    try {
      const isTactics = /阵容|组合|搭配|双烟|双决斗|选什么|推荐|怎么打|进攻|防守|战术/.test(text)
      const isLineups = /点位|技能|位置|瞄点|怎么用|连招|道具|在哪/.test(text)
      const [tacRes, linRes] = await Promise.all([
        (isTactics || !isLineups) ? supabase.from('tactical_shares').select('title,description,map_id,like_count').eq('map_id', mapId).order('like_count', { ascending: false }).limit(10) : Promise.resolve(null),
        (isLineups || !isTactics) ? supabase.from('lineups').select('title,description,map_id,like_count,agent_id,ability_id').eq('map_id', mapId).order('like_count', { ascending: false }).limit(10) : Promise.resolve(null),
      ])
      const refs: string[] = []
      ;(tacRes?.data || []).forEach((t: any) => {
        if (!t.title) return
        const h = (t.title + (t.description || '')).toLowerCase()
        if (negatedKW.some(kw => h.includes(kw.toLowerCase()))) return
        refs.push(`战术「${t.title}」${t.description ? '：' + t.description.slice(0, 60) : ''} 👍${t.like_count || 0}`)
      })
      ;(linRes?.data || []).forEach((l: any) => {
        if (!l.title) return
        const h = (l.title + (l.description || '')).toLowerCase()
        if (negatedKW.some(kw => h.includes(kw.toLowerCase()))) return
        const a = agents.find(x => x.id === l.agent_id)
        const ab = a?.abilities.find(x => x.id === l.ability_id)
        refs.push(`点位「${l.title}」(${a?.name || l.agent_id} ${ab?.name || l.ability_id})${l.description ? '：' + l.description.slice(0, 40) : ''} 👍${l.like_count || 0}`)
      })
      const filtered = refs.slice(0, 3)
      console.debug(`[T教练·调试] 社区参考：查战术=${isTactics} 查点位=${isLineups} → 否定词[${negatedKW.join(',')}] 过滤前${refs.length}→过滤后${filtered.length}`)
      if (filtered.length > 0) communityRefs = `【社区相关参考·${maps.find(m => m.id === mapId)?.name || mapId}】\n${filtered.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
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
        for (const a of agents) { if (text.includes(a.name)) tacKW.add(a.name.toLowerCase()) }

        // ③ 排除否定关键词
        for (const nk of negatedKW) { tacKW.delete(nk.toLowerCase()) }
        for (const nk of negatedKW) {
          for (const a of agents) { if (a.name.includes(nk) || nk.includes(a.name)) tacKW.delete(a.name.toLowerCase()) }
        }

        let relevant = freshInsights.filter((ins: any) => {
          const h = ((ins.content || '') + (ins.category || '')).toLowerCase()
          const m = mapKW.size === 0 || Array.from(mapKW).some(k => h.includes(k))
          const t = tacKW.size === 0 || Array.from(tacKW).some(k => h.includes(k))
          return m && t
        })

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

        console.debug(`[T教练·调试] 知识洞察：地图KW[${Array.from(mapKW).join(',')}] 战术KW[${Array.from(tacKW).join(',')}] 否定词[${negatedKW.join(',')}] 拉取${insights.length}→去重后${freshInsights.length}→交集匹配${relevant.length}→TOP10排序`)

        if (relevant.length > 0) {
          knowledgeRefs = `【已入库的职业战术数据·匹配${relevant.length}条】（以下是与当前问题最相关的战术知识，请优先引用）：\n\n${relevant.map((ins: any, i: number) => `${i + 1}. [${ins.source || '未知来源'}] ${ins.content.slice(0, 500)}`).join('\n\n')}`
          // ① 标记已注入，后续消息不再重复
          markInsightsInjected(relevant.map((ins: any) => ins.id))
        }
      }
    } catch {}

    // 棋盘 + 对局 + 比赛
    let boardState = ''
    if (showBoardInfo) boardState = formatBoardStateForAI(mapName, side, agentPositions, abilityShapes, drawings, textAnnotations, markers, roster)

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

    let matchData = ''
    const ctx = loadMatchContext()
    if (ctx.mode !== 'none') {
      const matches = loadMatches()
      if (matches.length > 0) {
        if (ctx.mode === 'single' && ctx.matchId) {
          const match = matches.find(m => m.id === ctx.matchId)
          if (match) matchData = `以下是我选定的一场比赛数据：\n\n${formatSingleMatchForAI(match)}`
        } else {
          matchData = `以下是我的全部比赛数据：\n\n${formatMatchHistoryForAI(matches)}`
        }
      }
    }

    // 对局状态
    let matchState = formatMatchStateForAI()

    // ⑦ 所有上下文合并为一条消息
    const blocks: string[] = []
    if (knowledgeRefs) blocks.push(knowledgeRefs)
    if (communityRefs) blocks.push(communityRefs)
    if (matchState) blocks.push(matchState)
    if (boardState) blocks.push(boardState)
    if (matchInfo) blocks.push(matchInfo)
    if (matchData) blocks.push(matchData)

    // ④ 长对话截断：超过10轮只保留最近10轮，并附前文摘要
    const MAX_ROUNDS = 10
    const recentMsgs = msgs.length > MAX_ROUNDS * 2
      ? [{ role: 'user' as const, content: buildTruncationSummary(msgs.slice(0, -MAX_ROUNDS * 2)) },
         { role: 'assistant' as const, content: '明白，我已了解前文背景。' },
         ...msgs.slice(-MAX_ROUNDS * 2)]
      : msgs

    const allMessages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: buildKnowledgeBase(mapName, side, agentNames, isCompact) },
      { role: 'assistant', content: '明白。我是T教练，已掌握全部29位特工技能数据和12张地图信息，请随时提问。' },
      ...(blocks.length ? [
        { role: 'user' as const, content: '【综合上下文】\n\n' + blocks.join('\n\n---\n\n') },
        { role: 'assistant' as const, content: '收到，我已了解全部上下文。' },
      ] : []),
      ...recentMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
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
        // 存到 Supabase 知识库
        let convId: string | undefined
        if (user || true) { // 匿名也存
          const agentNames = getAgentNames(agentIds)
          const { data: row } = await supabase.from('ai_conversations').insert({
            user_id: user?.id || null,
            question: text,
            answer: content,
            model: config.model,
            map_name: mapName,
            side,
            agents: agentNames.join(','),
          }).select('id').single()
          convId = row?.id
        }
        setMessages(prev => [...prev, { role: 'assistant', content, convId, rating: 0 }])
        if (isFree) {
          incrTodayUsage(config.model)
          setTodayUsed(getSharedUsage())
        }
      }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('Failed to fetch')) setMessages(prev => [...prev, { role: 'assistant', content: '❌ 网络连接失败' }])
      else if (msg.includes('401') || msg.includes('403')) setMessages(prev => [...prev, { role: 'assistant', content: '❌ 服务暂不可用' }])
      else setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${msg || '请求失败'}` }])
    } finally { setLoading(false) }
  }

  const quickPrompts = getDynamicQuickPrompts(mapName, side)

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="36" height="36" style={{flexShrink:0}}>
              <defs><linearGradient id="aig" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
              <rect width="120" height="120" rx="26" fill="none"/>
              <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#aig)" strokeWidth="2" transform="rotate(-12,37,39)"/>
              <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#aig)" opacity="0.25" transform="rotate(5,53,35)"/>
              <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#aig)" strokeWidth="2" transform="rotate(-3,44,54)"/>
              <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#aig)" opacity="0.35" transform="rotate(10,61,51)"/>
              <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#aig)" strokeWidth="2" transform="rotate(-8,74,68)"/>
              <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
            </svg>
            <h1 className={styles.logo}>T教练</h1>
          </div>
          <button className={styles.backBtn} onClick={onBack}>← 返回战术板</button>
        </div>

        {/* ====== 套餐方案 ====== */}
        <div className={styles.sidebarSection}>
          <h3 onClick={() => setShowPlans(v => !v)} style={{ cursor: 'pointer' }}>
            💳 套餐方案 <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginLeft: 'auto' }}>{showPlans ? '▲' : '▼'}</span>
          </h3>
          {showPlans && (
            <div className={styles.plansList}>
              {PLANS.filter(p => p.tier !== 'free').map((p, i) => {
                const tierOrder = ['free', 'basic', 'advanced', 'pro']
                const currentIdx = tierOrder.indexOf(tier)
                const planIdx = tierOrder.indexOf(p.tier)
                const isCurrentTier = planIdx === currentIdx && isFree
                const isLocked = isFree && planIdx > currentIdx
                const isExpanded = expandedPlan === p.tier
                return (
                  <React.Fragment key={i}>
                    <div
                      className={`${styles.planCard} ${isLocked ? styles.planCardLocked : ''} ${isCurrentTier ? styles.planCardCurrent : ''}`}
                      style={{ cursor: 'pointer', animationDelay: `${i * 0.12}s`, ...(isCurrentTier ? { borderColor: p.color } : {}) }}
                      onClick={() => setExpandedPlan(isExpanded ? null : p.tier)}>
                      <div className={styles.planIcon}><PlanIcon tier={p.tier} color={p.color} /></div>
                      <div className={styles.planInfo}>
                        <div className={styles.planName} style={{ color: isLocked ? 'rgba(255,255,255,.25)' : p.color }}>
                          {p.name}
                          {isCurrentTier && <span style={{ fontSize: 10, marginLeft: 6, color: p.color }}>● 当前</span>}
                        </div>
                        <div className={styles.planDetail}>{p.detail}</div>
                      </div>
                      <div className={styles.planPrice} style={{ color: isLocked ? 'rgba(255,255,255,.2)' : undefined }}>
                        {isLocked ? <span style={{ fontSize: 14, filter: 'grayscale(1)', opacity: .5 }}>🔒</span> : `${p.price}`}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className={styles.planExpand} style={{ animationDelay: `${i * 0.12 + 0.05}s` }}>
                        <div style={{ marginBottom: 4, color: p.color, fontWeight: 600, fontSize: 11 }}>
                          全部 4 种 AI 模式
                        </div>
                        {[
                          { name: '快速模式', limit: '20次/天' },
                          { name: '均衡模式', limit: '10次/天' },
                          { name: '推理模式', limit: '5次/天' },
                          { name: '深度模式', limit: '3次/天' },
                        ].map(m => (
                          <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
                            <span style={{ color: 'rgba(255,255,255,.35)' }}>{m.name}</span>
                            <span style={{ color: 'rgba(255,255,255,.2)' }}>{m.limit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* ====== 模式选择 ====== */}
        <div className={styles.sidebarSection}>
          <h3 onClick={() => setShowModels(v => !v)} style={{ cursor: 'pointer' }}>
            ⚡ 模式选择 <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginLeft: 'auto' }}>{showModels ? '▲' : '▼'}</span>
          </h3>
          {showModels && (
            <div className={styles.modelList}>
              {models.map(m => {
                const locked = isFree && !(TIER_MODELS[tier]?.includes(m.id))
                const isCurrent = config.model === m.id
                const cap = MODEL_LIMITS[m.id] || TIER_TOTAL_LIMITS[tier]
                const usage = getTodayUsage(m.id)
                const remaining = Math.max(0, cap - usage)
                const limitText = isFree
                  ? `剩余 ${remaining} 次`
                  : `${cap}次/天`
                const isFreeModel = m.tier === '免费'
                return (
                  <button key={m.id}
                    className={`${styles.modelCard} ${isCurrent ? styles.modelCardActive : ''} ${locked ? styles.modelCardLocked : ''}`}
                    onClick={() => !locked && setConfig((c: AIConfig) => ({ ...c, model: m.id }))}>
                    <div className={styles.modelIcon}><ModelIcon modelId={m.id} /></div>
                    <div className={styles.modelInfo}>
                      <div className={styles.modelName}>
                        {m.name.replace(/^[^\w一-鿿]+/, '').trim()}
                        {isFreeModel && <span className={styles.unlockFree} style={{ fontSize: 9, marginLeft: 6, padding: '1px 6px', verticalAlign: 'middle' }}>免费</span>}
                      </div>
                      <div className={styles.modelDesc}>{m.perf}</div>
                      <div className={styles.modelLimit} style={{ fontSize: 9, color: 'rgba(255,255,255,.15)', marginTop: 2 }}>
                        {m.id === 'deepseek-reasoner' || m.id === 'deepseek-v4-pro'
                          ? '基础知识库＋核心知识库 15篇'
                          : '基础知识库 8篇'}
                      </div>
                      <div className={styles.modelLimit}>
                        {locked ? '🔒 需升级套餐' : limitText || '可用'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {isFree ? (
          <div className={styles.sidebarSection}>
            <div className={styles.freeBanner}>
              {tier === 'free' ? `🎉 免费套餐 · 剩余 ${Math.max(0, 5 - todayUsed)} 次` : `✅ ${PLANS.find(p => p.tier === tier)?.name || tier}套餐`}
            </div>
            {/* 激活码 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input className={styles.keyInput} value={actCode} placeholder="输入激活码升级套餐..."
                onChange={e => { setActCode(e.target.value); setActStatus('') }}
                onKeyDown={e => { if (e.key === 'Enter') { if (!requireUser()) return; const c = actCode; activateCode(c).then(r => { if (r.ok) { setTier(r.tier || 'free'); localStorage.setItem('val-tactics-tier', r.tier || 'free'); localStorage.setItem('val-tactics-tier-at', String(Date.now())); syncTierToSupabase(r.tier || 'free', r.expiresAt); setActCode(''); setActStatus('✅ 激活成功！') } else setActStatus('❌ ' + (r.error || '失败')) }) } }}
                style={{ flex: 1, fontSize: 11 }} />
              <button className={styles.keySaveBtn} onClick={async () => {
                if (!requireUser()) return
                const r = await activateCode(actCode)
                if (r.ok) { setTier(r.tier || 'free'); localStorage.setItem('val-tactics-tier', r.tier || 'free'); localStorage.setItem('val-tactics-tier-at', String(Date.now())); syncTierToSupabase(r.tier || 'free', r.expiresAt); setActCode(''); setActStatus('✅ 激活成功！') }
                else setActStatus('❌ ' + (r.error || '激活失败'))
              }}>激活</button>
            </div>
            {actStatus && (
              <div style={{ fontSize: 11, marginTop: 4, color: actStatus.includes('✅') ? '#05F8F8' : '#E349ED' }}>{actStatus}</div>
            )}
            {tier !== 'free' && import.meta.env.DEV && (
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                <span style={{ cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,.2)' }}
                  onClick={() => { setTier('free'); localStorage.removeItem('val-tactics-tier'); localStorage.removeItem('val-tactics-tier-at'); syncTierToSupabase('free') }}>
                  取消套餐
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.sidebarSection}>
            <div className={styles.freeBanner} style={{ background: 'rgba(227,73,237,.08)', borderColor: 'rgba(227,73,237,.2)', color: '#f0a0f0' }}>
              🔑 自备 Key · 全部已解锁
            </div>
            <button className={styles.keyBtn} onClick={() => { setConfig((c: AIConfig) => ({ ...c, apiKey: '' })); setTimeout(() => fetchModels(), 100) }}>
              ← 切换免费模式
            </button>
          </div>
        )}

        {/* ====== 自备 API ====== */}
        <div className={styles.sidebarSection}>
          <h3>🔌 自备 API</h3>
          {ownkeyActive ? (
            <div style={{
              padding: 12, borderRadius: 10,
              border: '1px solid rgba(5,248,248,.15)',
              background: 'linear-gradient(135deg, rgba(5,248,248,.06), rgba(227,73,237,.03))',
            }}>
              <div style={{ fontSize: 11, color: '#05F8F8', marginBottom: 8, fontWeight: 500 }}>✅ 已解锁 · 输入你的 Key</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className={styles.keyInput} type="password" value={keyInput}
                  placeholder="sk-..." onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveKey() }} style={{ flex: 1, fontSize: 11 }} />
                <button className={styles.keySaveBtn} onClick={saveKey}>确认</button>
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.15)', marginTop: 5 }}>
                支持 DeepSeek · OpenAI · Anthropic · Google
              </div>
              <div style={{ marginTop: 6, textAlign: 'right' }}>
                {import.meta.env.DEV && (
                  <span style={{ cursor: 'pointer', fontSize: 10, color: 'rgba(255,255,255,.2)' }}
                    onClick={deactivateOwnkey}>
                    取消激活
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div
                onClick={() => setShowOwnkey(v => !v)}
                style={{
                  padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: '2px dashed rgba(192,208,255,.12)',
                  background: 'rgba(192,208,255,.02)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all .3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(192,208,255,.3)'; e.currentTarget.style.background = 'rgba(192,208,255,.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(192,208,255,.12)'; e.currentTarget.style.background = 'rgba(192,208,255,.02)' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(192,208,255,.06)', border: '1px solid rgba(192,208,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 22 22">
                    <rect x="4" y="6" width="14" height="10" rx="2" fill="none" stroke="#c0d0ff" strokeWidth="1.4" opacity=".7"/>
                    <circle cx="8" cy="11" r="1.5" fill="#c0d0ff" opacity=".5"/>
                    <path d="M12 11h5" stroke="#c0d0ff" strokeWidth="1" opacity=".3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#c0d0ff' }}>自备 API Key</div>
                  <div style={{ fontSize: 10, color: 'rgba(192,208,255,.3)', marginTop: 1 }}>使用自有 Key · 不限制次数和模型</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#c0d0ff', flexShrink: 0 }}>¥19.9</div>
              </div>
              {showOwnkey && (
                <div style={{
                  marginTop: 8, padding: 12, borderRadius: 8,
                  border: '1px solid rgba(192,208,255,.08)',
                  background: 'rgba(192,208,255,.02)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>
                    💡 ¥19.9/月 · 填入你自己的 API Key 即可使用自带模型
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className={styles.keyInput} value={actCode} placeholder="输入激活码..."
                      onChange={e => { setActCode(e.target.value); setActStatus('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { if (!requireUser()) return; activateCode(actCode).then(r => { if (r.ok) { if (r.tier === 'ownkey') activateOwnkey(); else deactivateOwnkey() } else setActStatus('❌ '+ (r.error||'失败')) }) } }}
                      style={{ flex: 1, fontSize: 11 }} />
                    <button className={styles.keySaveBtn} onClick={async () => {
                      if (!requireUser()) return
                      const r = await activateCode(actCode)
                      if (r.ok) { if (r.tier === 'ownkey') activateOwnkey(); else deactivateOwnkey() }
                      else setActStatus('❌ '+ (r.error||'失败'))
                    }}>激活</button>
                  </div>
                  {actStatus && <div style={{ fontSize: 10, color: actStatus.includes('✅')?'#05F8F8':'#E349ED' }}>{actStatus}</div>}
                </div>
              )}
            </div>
          )}
        </div>
        <RosterPicker />
        <div className={styles.sidebarSection}>
          <h3>🗺️ 基础信息</h3>
          <div
            onClick={() => { const n = !showBoardInfo; setShowBoardInfo(n); localStorage.setItem('val-tactics-show-board-info', String(n)) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
              background: showBoardInfo
                ? 'linear-gradient(135deg, rgba(5,248,248,.08), rgba(227,73,237,.04))'
                : 'rgba(255,255,255,.02)',
              border: showBoardInfo
                ? '1px solid rgba(5,248,248,.2)'
                : '1px solid rgba(255,255,255,.06)',
              transition: 'all .3s cubic-bezier(.16,1,.3,1)',
              boxShadow: showBoardInfo ? '0 0 16px rgba(5,248,248,.06)' : 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: showBoardInfo ? '#05F8F8' : 'rgba(255,255,255,.45)', fontWeight: 500, transition: 'color .3s' }}>
                {showBoardInfo ? '● AI 正在读取棋盘' : '○ AI 仅用知识库'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginTop: 2 }}>
                特工站位 · 技能范围 · 绘图标注
              </div>
            </div>
            {/* 自定义开关 */}
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: showBoardInfo
                ? 'linear-gradient(135deg, #05F8F8, #E349ED)'
                : 'rgba(255,255,255,.1)',
              transition: 'all .3s cubic-bezier(.16,1,.3,1)',
              position: 'relative', flexShrink: 0,
              boxShadow: showBoardInfo ? '0 0 12px rgba(5,248,248,.25)' : 'none',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff',
                position: 'absolute', top: 2,
                left: showBoardInfo ? 20 : 2,
                transition: 'left .3s cubic-bezier(.16,1,.3,1)',
                boxShadow: showBoardInfo ? '0 0 8px rgba(5,248,248,.3)' : '0 1px 3px rgba(0,0,0,.3)',
              }} />
            </div>
          </div>
        </div>

        <div className={styles.sidebarSection}>
          <h3>📊 数据分析</h3>
          <MatchContextSelector />
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginTop: 6 }}>
            录入和编辑在「数据分析」页面
          </div>
        </div>
      </aside>

      <main className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.chatModel}>
            <div className={styles.eqBar}><span /><span /><span /><span /></div>
            T教练{config.model ? ` · ${(models.find(m => m.id === config.model)?.name || '').replace(/^[^\w一-鿿]+/, '').trim()}` : ''}
          </div>
          <div className={styles.chatStatus}>● 在线</div>
        </div>
        <div className={styles.messages} ref={scrollRef}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <div className={styles.welcomeIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="72" height="72">
                  <defs><linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
                  <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#welcomeGrad)" strokeWidth="2" transform="rotate(-12,37,39)"/>
                  <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#welcomeGrad)" opacity="0.25" transform="rotate(5,53,35)"/>
                  <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#welcomeGrad)" strokeWidth="2" transform="rotate(-3,44,54)"/>
                  <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#welcomeGrad)" opacity="0.35" transform="rotate(10,61,51)"/>
                  <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#welcomeGrad)" strokeWidth="2" transform="rotate(-8,74,68)"/>
                  <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
                </svg>
              </div>
              <h2>你好，我是你的 T教练</h2>
              <p>{isFree ? '免费套餐 · 每日5次 · 试试问我：' : '全部模式已解锁，尽情使用。试试问我：'}</p>
              <div className={styles.quickPrompts}>
                {quickPrompts.map((p, i) => (
                  <button key={i} className={styles.quickBtn} onClick={() => { setInput(p); inputRef.current?.focus() }}>{p}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? styles.userMsg : styles.aiMsg}>
                <div className={styles.msgAvatar}>
                  {m.role === 'user' ? '👤' : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="24" height="24">
                      <defs><linearGradient id={`msggrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
                      <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke={`url(#msggrad-${i})`} strokeWidth="2" transform="rotate(-12,37,39)"/>
                      <rect x="38" y="20" width="30" height="30" rx="7" fill={`url(#msggrad-${i})`} opacity="0.25" transform="rotate(5,53,35)"/>
                      <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke={`url(#msggrad-${i})`} strokeWidth="2" transform="rotate(-3,44,54)"/>
                      <rect x="48" y="38" width="26" height="26" rx="7" fill={`url(#msggrad-${i})`} opacity="0.35" transform="rotate(10,61,51)"/>
                      <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke={`url(#msggrad-${i})`} strokeWidth="2" transform="rotate(-8,74,68)"/>
                      <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
                    </svg>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={styles.msgContent}>{m.content}</div>
                  {m.role === 'assistant' && m.convId && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, paddingLeft: 4, opacity: .6 }}>
                      <span
                        onClick={async () => {
                          const nr = m.rating === 1 ? 0 : 1
                          setMessages(prev => prev.map(msg => msg.convId === m.convId ? { ...msg, rating: nr } : msg))
                          await supabase.from('ai_conversations').update({ rating: nr }).eq('id', m.convId!)
                        }}
                        style={{ cursor: 'pointer', fontSize: 14, opacity: m.rating === 1 ? 1 : .4, transition: 'opacity .2s', userSelect: 'none' }}
                        title="有帮助">👍</span>
                      <span
                        onClick={async () => {
                          const nr = m.rating === -1 ? 0 : -1
                          setMessages(prev => prev.map(msg => msg.convId === m.convId ? { ...msg, rating: nr } : msg))
                          await supabase.from('ai_conversations').update({ rating: nr }).eq('id', m.convId!)
                        }}
                        style={{ cursor: 'pointer', fontSize: 14, opacity: m.rating === -1 ? 1 : .4, transition: 'opacity .2s', userSelect: 'none' }}
                        title="没帮助">👎</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className={styles.aiMsg}>
              <div className={styles.msgAvatar}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="24" height="24">
                  <defs><linearGradient id="loadgrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#E349ED"/><stop offset="100%" stopColor="#05F8F8"/></linearGradient></defs>
                  <rect x="22" y="24" width="30" height="30" rx="7" fill="none" stroke="url(#loadgrad)" strokeWidth="2" transform="rotate(-12,37,39)"/>
                  <rect x="38" y="20" width="30" height="30" rx="7" fill="url(#loadgrad)" opacity="0.25" transform="rotate(5,53,35)"/>
                  <rect x="30" y="40" width="28" height="28" rx="7" fill="none" stroke="url(#loadgrad)" strokeWidth="2" transform="rotate(-3,44,54)"/>
                  <rect x="48" y="38" width="26" height="26" rx="7" fill="url(#loadgrad)" opacity="0.35" transform="rotate(10,61,51)"/>
                  <rect x="62" y="56" width="24" height="24" rx="7" fill="none" stroke="url(#loadgrad)" strokeWidth="2" transform="rotate(-8,74,68)"/>
                  <text x="58" y="72" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#fff" transform="rotate(-3,58,68)">T</text>
                </svg>
              </div>
              <div className={styles.msgContent}>
                <div className={styles.typing}>
                  分析中<div className={styles.typingDots}><span /><span /><span /></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={styles.inputBar}>
          <input ref={inputRef} className={styles.chatInput}
            value={input}
            placeholder={config.model ? '输入你的战术问题...' : '请先在左侧选择智能模式'}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button
            onClick={() => { setMessages([]); localStorage.removeItem('val-tactics-chat'); clearInjectedInsights() }}
            style={{
              padding: '8px 14px', background: 'transparent',
              border: '1px solid rgba(255,255,255,.08)', borderRadius: 14,
              color: 'rgba(255,255,255,.3)', fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all .2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E349ED'; e.currentTarget.style.borderColor = 'rgba(227,73,237,.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
            title="清除对话历史，重新开始"
          >重置</button>
          <button className={styles.sendBtn} onClick={() => send()} disabled={loading || !input.trim() || !config.model}>发送消息</button>
        </div>
      </main>
    </div>
  )
}
