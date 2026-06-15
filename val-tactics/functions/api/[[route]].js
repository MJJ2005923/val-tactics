/**
 * Pages Function: /api/ai | /api/models | /api/health
 * 部署时自动随 Cloudflare Pages 上线
 */

// 预置模型列表（所有厂商）
const PRESET_MODELS = {
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: '经济' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tier: '均衡' },
    { id: 'claude-opus-4-7-20250416', name: 'Claude Opus 4.7', tier: '旗舰' },
  ],
  openai: [
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini', tier: '经济' },
    { id: 'gpt-4.1', name: 'GPT-4.1', tier: '均衡' },
    { id: 'gpt-5.3-instant', name: 'GPT-5.3 Instant', tier: '均衡' },
    { id: 'gpt-5.4-thinking', name: 'GPT-5.4 Thinking', tier: '旗舰' },
    { id: 'gpt-5.5-instant', name: 'GPT-5.5 Instant', tier: '最新' },
    { id: 'o4-mini', name: 'o4-mini (推理)', tier: '推理' },
  ],
  google: [
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', tier: '经济' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: '均衡' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tier: '均衡' },
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', tier: '旗舰' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: '旗舰' },
  ],
  deepseek: [
    { id: 'deepseek-v4-flash', name: '快速模式', tier: '免费', perf: '日常问答 · 极速响应', limit: '5次/天', unlock: '免费可用' },
    { id: 'deepseek-chat', name: '均衡模式', tier: '标准', perf: '战术分析 · 阵容推荐', limit: '10次/天', unlock: '¥30/月' },
    { id: 'deepseek-reasoner', name: '推理模式', tier: '标准', perf: '极致推理 · 职业分析', limit: '3次/天', unlock: '¥30/月' },
    { id: 'deepseek-v4-pro', name: '深度模式', tier: '标准', perf: '深度策略 · 复杂推演', limit: '2次/天', unlock: '¥30/月' },
  ],
}

const PROVIDERS = {
  anthropic: {
    chatUrl: 'https://api.anthropic.com/v1/messages',
    listModels: async () => PRESET_MODELS.anthropic,
    chatHeaders: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
  openai: {
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    listModels: async (key) => {
      const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } })
      const data = await r.json()
      return (data.data || []).filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4')).map(m => ({ id: m.id, name: m.id })).slice(0, 30)
    },
    chatHeaders: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
  google: {
    chatUrl: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    listModels: async (key) => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, { headers: { 'x-goog-api-key': key } })
      const data = await r.json()
      return (data.models || []).filter(m => m.name.includes('gemini')).map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name })).slice(0, 30)
    },
    chatHeaders: (key) => ({ 'x-goog-api-key': key, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 2048 },
    }),
    keyInQuery: false,
  },
  deepseek: {
    chatUrl: 'https://api.deepseek.com/v1/chat/completions',
    listModels: async () => PRESET_MODELS.deepseek,
    chatHeaders: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
}

// 服务端 API Keys — 从环境变量读取
function getServerKey(provider, env) {
  switch (provider) {
    case 'deepseek': return env.DEEPSEEK_KEY || ''
    case 'anthropic': return env.ANTHROPIC_KEY || ''
    case 'openai': return env.OPENAI_KEY || ''
    case 'google': return env.GOOGLE_KEY || ''
    default: return ''
  }
}

// 免费额度限制
const FREE_LIMIT = 5 // 每天每人免费 5 次（与前端套餐方案一致）
const RATE_PER_MIN = 30 // 每 IP 每分钟最大请求数
const RATE_PER_HOUR = 500 // 每 IP 每小时最大请求数

// 标准套餐按模型分拆日次数（Fast 20 / Balanced 10 / Reasoning 3 / Deep 2）
const MODEL_LIMITS = {
  'deepseek-v4-flash': 20,
  'deepseek-chat': 10,
  'deepseek-reasoner': 3,
  'deepseek-v4-pro': 2,
}

/**
 * IP 级别限流检查（基于 Cloudflare KV）
 * @returns {number} 0=通过, 429=超限
 */
async function checkRateLimit(ip, env) {
  if (!env.AI_USAGE) return 0 // 本地开发跳过
  const now = Date.now()
  // 每分钟限制
  const minKey = `rl:min:${ip}:${Math.floor(now / 60000)}`
  const minCount = parseInt(await env.AI_USAGE.get(minKey) || '0')
  if (minCount >= RATE_PER_MIN) return 429
  await env.AI_USAGE.put(minKey, String(minCount + 1), { expirationTtl: 120 })
  // 每小时限制
  const hourKey = `rl:hour:${ip}:${Math.floor(now / 3600000)}`
  const hourCount = parseInt(await env.AI_USAGE.get(hourKey) || '0')
  if (hourCount >= RATE_PER_HOUR) return 429
  await env.AI_USAGE.put(hourKey, String(hourCount + 1), { expirationTtl: 7200 })
  return 0
}

export async function onRequest(context) {
  const { request, env } = context
  const origin = request.headers.get('Origin') || ''
  const allowedOrigins = ['https://val-tactics.pages.dev', 'https://dev.val-tactics.pages.dev', 'http://localhost:5173', 'http://localhost:8788']
  const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://val-tactics.pages.dev',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)

  // 健康检查
  if (url.pathname === '/api/health') {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // 旧套餐 → 新套餐映射（新定价统一为 standard）
  const TIER_MIGRATION = { basic: 'standard', advanced: 'standard', pro: 'standard', standard: 'standard', free: 'free', ownkey: 'ownkey' }

  // 开发环境测试激活码（KV 不可用时的 fallback）
  const isDev = env.CF_PAGES_BRANCH === 'dev' || !env.CF_PAGES
  const DEV_CODES = isDev ? {
    'TEST-BASIC':    { tier: 'standard',  expiresAt: 0 },
    'TEST-ADVANCED': { tier: 'standard',  expiresAt: 0 },
    'TEST-PRO':      { tier: 'standard',  expiresAt: 0 },
    'TEST-OWNKEY':   { tier: 'ownkey',    expiresAt: 0 },
    'TEST-FREE':     { tier: 'free',      expiresAt: 0 },
    'TEST-NO-OWNKEY':  { tier: 'free',    expiresAt: 0 },
  } : {}

  // 免邮件注册（绕过 SMTP）— 加 IP 限流防批量注册
  if (url.pathname === '/api/signup') {
    const ip = request.headers.get('cf-connecting-ip') || 'local'
    if (env.AI_USAGE) {
      const signupKey = `rl:signup:${ip}:${Math.floor(Date.now() / 3600000)}`
      const signupCount = parseInt(await env.AI_USAGE.get(signupKey) || '0')
      if (signupCount >= 3) return new Response(JSON.stringify({ error: '注册频率过高，请1小时后再试' }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      await env.AI_USAGE.put(signupKey, String(signupCount + 1), { expirationTtl: 3600 })
    }
    const { email, password } = await request.json()
    if (!email || !password) {
      return new Response(JSON.stringify({ error: '缺少邮箱或密码' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const resp = await fetch(`https://zwtpeyvqbllrpregjpyd.supabase.co/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY || '',
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
      const data = await resp.json()
      if (resp.ok) {
        return new Response(JSON.stringify({ ok: true, user: data }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: data.msg || '注册失败' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // 激活码验证
  if (url.pathname === '/api/activate') {
    const { code, userId } = await request.json()
    if (!code || !userId) {
      return new Response(JSON.stringify({ error: '缺少激活码或用户ID' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    const normalized = code.toUpperCase().trim()
    try {
      const codeData = await env.AI_USAGE.get(`code:${normalized}`, { type: 'json' })
      if (!codeData) {
        // KV 中未找到，检查开发环境测试码
        if (DEV_CODES[normalized]) {
          const mt = TIER_MIGRATION[DEV_CODES[normalized].tier] || DEV_CODES[normalized].tier
          return new Response(JSON.stringify({ ok: true, tier: mt, expiresAt: 0, dev: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
        return new Response(JSON.stringify({ error: '激活码无效' }), { status: 404, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      if (codeData.used && codeData.usedBy !== userId) {
        return new Response(JSON.stringify({ error: '激活码已被使用' }), { status: 409, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      // 旧 tier 自动迁移到新套餐
      const migratedTier = TIER_MIGRATION[codeData.tier] || codeData.tier
      // 根据前缀自动算过期：MONTH=30天 QUART=90天 YEAR=365天
      let expiresAt = codeData.expiresAt || 0
      if (!expiresAt) {
        if (normalized.startsWith('VAL-MONTH')) expiresAt = Date.now() + 30 * 86400000
        else if (normalized.startsWith('VAL-QUART')) expiresAt = Date.now() + 90 * 86400000
        else if (normalized.startsWith('VAL-YEAR')) expiresAt = Date.now() + 365 * 86400000
        else expiresAt = Date.now() + 30 * 86400000 // 默认30天
      }
      // 标记使用
      await env.AI_USAGE.put(`code:${normalized}`, JSON.stringify({ ...codeData, used: true, usedBy: userId, usedAt: Date.now(), migratedTier, expiresAt }))
      // 存储用户套餐
      const userTier = { tier: migratedTier, activatedAt: Date.now(), expiresAt }
      await env.AI_USAGE.put(`tier:${userId}`, JSON.stringify(userTier))
      return new Response(JSON.stringify({ ok: true, tier: migratedTier, expiresAt }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      // KV 不可用（本地开发），检查测试码
      if (DEV_CODES[normalized]) {
        return new Response(JSON.stringify({ ok: true, tier: DEV_CODES[normalized].tier, expiresAt: 0, dev: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: '激活码无效' }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // 查询用户套餐状态
  if (url.pathname === '/api/tier') {
    const { userId } = await request.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: '缺少用户ID' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const userTier = await env.AI_USAGE.get(`tier:${userId}`, { type: 'json' })
      return new Response(JSON.stringify({ tier: userTier?.tier || 'free', expiresAt: userTier?.expiresAt || 0 }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch {
      return new Response(JSON.stringify({ tier: 'free' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // 管理端点：批量导入激活码
  if (url.pathname === '/api/admin/seed' && request.method === 'POST') {
    const { adminKey, codes } = await request.json()
    if (adminKey !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    if (!env.AI_USAGE) {
      return new Response(JSON.stringify({ error: 'KV 不可用' }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    if (!Array.isArray(codes)) {
      return new Response(JSON.stringify({ error: 'codes 应为数组 [{code, tier}]' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    let count = 0
    for (const c of codes) {
      if (!c.code || !c.tier) continue
      await env.AI_USAGE.put(`code:${c.code}`, JSON.stringify({ tier: c.tier, expiresAt: c.expiresAt || 0, createdAt: Date.now() }))
      count++
    }
    return new Response(JSON.stringify({ ok: true, count }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // 管理后台：全量统计（需 ADMIN_KEY）
  if (url.pathname === '/api/admin/stats') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const svcKey = env.SUPABASE_SERVICE_KEY || ''
      const baseHeaders = { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}`, 'Accept': 'application/json' }
      const countHeader = { ...baseHeaders, 'Prefer': 'count=exact' }

      // Supabase 内容统计
      const [userResp, tacResp, postResp, lineupResp, commentResp] = await Promise.all([
        fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/auth/v1/admin/users?per_page=1', { headers: countHeader }),
        fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/rest/v1/tactical_shares?select=id', countHeader),
        fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/rest/v1/posts?select=id', countHeader),
        fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/rest/v1/lineups?select=id', countHeader),
        fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/rest/v1/comments?select=id', countHeader),
      ])
      const getCount = (r) => parseInt(r.headers.get('content-range')?.split('/')[1] || '0')
      const totalUsers = parseInt(userResp.headers.get('x-total-count') || userResp.headers.get('content-range')?.split('/')[1] || '0')
      const contentCounts = {
        tactics: getCount(tacResp),
        posts: getCount(postResp),
        lineups: getCount(lineupResp),
        comments: getCount(commentResp),
      }

      // KV 统计
      let tierCounts = { free: 0, basic: 0, advanced: 0, pro: 0, ownkey: 0 }
      let usedCodes = 0, totalCodes = 0, revenue = 0
      if (env.AI_USAGE) {
        const tierList = await env.AI_USAGE.list({ prefix: 'tier:' })
        for (const k of tierList.keys) {
          try {
            const t = await env.AI_USAGE.get(k.name, { type: 'json' })
            const tier = t?.tier || 'free'
            tierCounts[tier] = (tierCounts[tier] || 0) + 1
            // 收入估算
            if (tier === 'basic') revenue += 24.9
            else if (tier === 'advanced') revenue += 59.9
            else if (tier === 'pro') revenue += 99.9
            else if (tier === 'ownkey') revenue += 19.9
            else if (tier === 'standard') revenue += 30
          } catch {}
        }
        // 激活码统计
        const codeList = await env.AI_USAGE.list({ prefix: 'code:' })
        totalCodes = codeList.keys.length
        for (const k of codeList.keys) {
          try {
            const c = await env.AI_USAGE.get(k.name, { type: 'json' })
            if (c?.used) usedCodes++
          } catch {}
        }
        // AI 每日用量
        const today = new Date().toISOString().slice(0, 10)
        const dailyUsage = { 'deepseek-v4-flash': 0, 'deepseek-chat': 0, 'deepseek-reasoner': 0, 'deepseek-v4-pro': 0 }
        for (const model of Object.keys(dailyUsage)) {
          const count = parseInt(await env.AI_USAGE.get(`usage:${today}:${model}`) || '0')
          dailyUsage[model] = count
        }
        return new Response(JSON.stringify({
          totalUsers, tierCounts, contentCounts,
          activation: { usedCodes, totalCodes, remaining: totalCodes - usedCodes },
          revenue: Math.round(revenue), dailyUsage,
          online: 'https://val-tactics.pages.dev',
        }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      // 无 KV 环境（本地开发）
      return new Response(JSON.stringify({
        totalUsers, tierCounts, contentCounts,
        activation: { usedCodes: 0, totalCodes: 0, remaining: 0 },
        revenue: 0, dailyUsage: {},
        online: 'https://val-tactics.pages.dev',
      }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // 一键初始化 Storage bucket
  if (url.pathname === '/api/admin/setup-storage') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    const svcKey = env.SUPABASE_SERVICE_KEY || ''
    try {
      const created = []
      for (const bucketId of ['lineups', 'avatars']) {
        const resp = await fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/storage/v1/bucket', {
          method: 'POST',
          headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bucketId, name: bucketId, public: true, file_size_limit: 5242880 }),
        })
        const body = await resp.json().catch(() => ({}))
        if (resp.ok || body.statusCode === '409') created.push(bucketId)
      }
      return new Response(JSON.stringify({ ok: true, message: `Buckets 已就绪: ${created.join(', ')}` }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // 内容安全审核（供社区功能调用）
  if (url.pathname === '/api/content-filter') {
    const { text } = await request.json()
    if (!text) {
      return new Response(JSON.stringify({ allowed: false, level: 'block', reason: '内容为空' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }

    // 第一层：敏感词库快速匹配
    const blockedWords = [
      '习近平','毛主席','共产党','六四','天安门','法轮功','达赖','藏独','疆独','台独','反共','反华','颠覆','暴动','文革',
      '裸聊','约炮','一夜情','嫖娼','卖淫','色情','AV','毛片','草榴','91视频','福利姬','做爱','性交','操你','日你',
      '杀人','砍死','屠杀','恐怖组织','ISIS','圣战','自制枪支','割喉','碎尸',
      '赌博','赌场','博彩','时时彩','六合彩','刷单','日赚','套现',
      '支那','东亚病夫','黑鬼','nigger','faggot',
    ]
    const lower = text.toLowerCase()
    const hits = blockedWords.filter(w => lower.includes(w.toLowerCase()))
    if (hits.length > 0) {
      return new Response(JSON.stringify({ allowed: false, level: 'block', reason: `包含违规内容`, flags: ['sensitive_words'] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }

    // 第二层：AI 深度审核（可选，使用 DeepSeek Flash 快速判断）
    const dskey = env.DEEPSEEK_KEY
    if (dskey) {
      try {
        const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: '你是内容安全审核员。判断文本是否可以发布到游戏社区。只回复 PASS、REVIEW 或 BLOCK，加一句简短原因。' },
              { role: 'user', content: text },
            ],
            max_tokens: 30, temperature: 0,
          }),
        })
        const aiData = await aiResp.json()
        const verdict = aiData.choices?.[0]?.message?.content?.trim().toUpperCase() || 'REVIEW'
        if (verdict.startsWith('BLOCK')) {
          return new Response(JSON.stringify({ allowed: false, level: 'block', reason: verdict, flags: ['ai_blocked'] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
        if (verdict.startsWith('REVIEW')) {
          return new Response(JSON.stringify({ allowed: true, level: 'pass', reason: '审核通过(AI标记)', flags: ['ai_review'] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
      } catch {} // AI 不可用时降级为通过（已过词库）
    }

    return new Response(JSON.stringify({ allowed: true, level: 'pass', reason: '审核通过', flags: [] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  /** 从 AI 返回文本中提取 JSON 数组 */
  function parseAIJson(text) {
    if (!text) return []
    // 去掉 markdown 代码块包裹
    let t = text.trim()
    if (t.startsWith('```')) { t = t.replace(/^```\w*\n/, '').replace(/\n```$/, '') }
    try { const r = JSON.parse(t); return Array.isArray(r) ? r : [] } catch {}
    // 尝试匹配 [...]
    const m = t.match(/\[[\s\S]*\]/)
    if (m) {
      try { const r = JSON.parse(m[0]); return Array.isArray(r) ? r : [] } catch {}
      // 最后手段 — 逐行解析
      try {
        const items = []
        const matches = m[0].matchAll(/\{[^}]+\}/g)
        for (const item of matches) { try { items.push(JSON.parse(item[0])) } catch {} }
        return items
      } catch {}
    }
    return []
  }

  const SB_URL = 'https://zwtpeyvqbllrpregjpyd.supabase.co'
  const SB_KEY = env.SUPABASE_SERVICE_KEY || ''
  const SB_HEADERS_POST = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

  // 无畏契约全部29特工+技能+地图数据（注入AI提示词确保名称准确，严格对齐agents.ts）
  const GAME_DATA = `【无畏契约全部29位特工及技能——必须使用以下中文名称，一个都不能错】

== 决斗者(8位) ==
婕提(Jett)：瞬云(C)、凌空(Q)、逐风(E)、飓刃(X)
不死鸟(Phoenix)：火冒三丈(C)、火热手感(Q)、闪光曲球(E)、再火一回(X)
雷兹(Raze)：花车巡游(C)、惊喜翻腾(Q)、彩雷飞溅(E)、晚安焰火(X)
蕾娜(Reyna)：睥睨(C)、噬尽(Q)、逐散(E)、女皇旨令(X)
夜露(Yoru)：出其不意(C)、攻其不备(Q)、不请自来(E)、神鬼不觉(X)
霓虹(Neon)：高速通道(C)、闪电弹球(Q)、充能疾驰(E)、超限暴走(X)
壹决(Iso)：绝对屏障(C)、稳态剥离(Q)、战斗心流(E)、决斗通牒(X)
幻棱(Waylay)：光棱闪爆(C)、光速飞跃(Q)、溯流回光(E)、时光修罗场(X)

== 先锋(7位) ==
铁臂(Breach)：剧震余波(C)、闪点爆破(Q)、山崩地陷(E)、惊雷卷地(X)
猎枭(Sova)：枭型无人机(C)、雷击箭(Q)、寻敌箭(E)、狂猎之怒(X)
斯凯(Skye)：愈生之息(C)、辟林之虎(Q)、引路之隼(E)、追猎之灵(X)
KAY/O：碎片溢出(C)、闪存过载(Q)、零点嗅探(E)、无效指令(X)
黑梦(Fade)：黯兽(C)、幽爪(Q)、诡眼(E)、夜临(X)
盖可(Gekko)：嗨爆全场(C)、顽皮搭档(Q)、炫晕光波(E)、无敌超鲨(X)
钛狐(Tejo)：潜袭爬虫(C)、特快专递(Q)、精准投放(E)、末日审判(X)

== 控场者(7位) ==
蝰蛇(Viper)：蛇吻(C)、瘴云(Q)、毒幕(E)、蝰腹(X)
炼狱(Brimstone)：振奋信标(C)、燃烧榴弹(Q)、空投烟幕(E)、天基光束(X)
幽影(Omen)：践影(C)、暗魇(Q)、黑瘴(E)、离魂(X)
星礈(Astra)：重力之阱(C)、新星脉冲(Q)、星云(E)、宇宙分裂(X)
海神(Harbor)：乱涌(C)、狂潮(Q)、海盾(E)、清算(X)
暮蝶(Clove)：虹吸(C)、整蛊(Q)、霞染(E)、化蝶(X)
迷核(Miks)：电音脉冲(C)、共振谐律(Q)、声波帷幕(E)、音脉强袭(X)

== 哨卫(7位) ==
奇乐(Killjoy)：纳米蜂群(C)、自动哨兵(Q)、哨戒炮台(E)、全面封锁(X)
零(Cypher)：震慑绊线(C)、赛博囚笼(Q)、战术监控(E)、神经取析(X)
贤者(Sage)：玉城(C)、薄冰(Q)、逢春(E)、再起(X)
尚博勒(Chamber)：贵宾限行(C)、金牌猎头(Q)、闪转自如(E)、孤高火力(X)
钢锁(Deadlock)：阻域屏障(C)、声感陷阱(Q)、重力捕网(E)、断魂索道(X)
维斯(Vyse)：剃刀藤蔓(C)、裁断(Q)、弧光玫瑰(E)、铁棘禁园(X)
禁灭(Veto)：涡流折跃(C)、裂变残片(Q)、噬源体(E)、完全进化(X)

【无畏契约全部地图（必须使用以下中文名称）】
亚海悬城(Ascent)、源工重镇(Bind)、森寒冬港(Icebox)、霓虹町(Split)、微风岛屿(Breeze)、隐世修所(Haven)、裂变峡谷(Fracture)、深海明珠(Pearl)、日落之城(Sunset)、莲华古城(Lotus)、幽邃地窖(Abyss)、盐海矿镇(Salt Chuck Mine Town)

注意：所有特工名、技能名、地图名必须严格使用上面列出的中文名称，禁止自创译名或使用英文名。禁止使用"某个特工""某个英雄""一个技能"等模糊表述。`

  // === GET /api/admin/debug ===
  if (url.pathname === '/api/admin/debug') {
    const allKeys = Object.keys(env).filter(k => !k.startsWith('CF_'))
    const target = allKeys.filter(k => k.includes('SUPA') || k.includes('SERVICE') || k.includes('KEY'))
    return new Response(JSON.stringify({ allKeys, target, sbKey: !!SB_KEY, sbKeyLen: SB_KEY.length, adminKey: !!env.ADMIN_KEY, deepseekKey: !!env.DEEPSEEK_KEY }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // === POST /api/admin/check-version (检测新版本拉取patch notes) ===
  if (url.pathname === '/api/admin/check-version' && request.method === 'POST') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      // 获取当前版本
      const verResp = await fetch('https://valorant-api.com/v1/version')
      const verData = await verResp.json()
      const currentVersion = verData?.data?.version || verData?.data?.manifestId || ''
      if (!currentVersion) return new Response(JSON.stringify({ error: '无法获取版本信息' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 检查 KV 中的上次版本
      const lastVersion = await env.AI_USAGE?.get('latest_version') || ''
      if (currentVersion === lastVersion) {
        return new Response(JSON.stringify({ ok: true, version: currentVersion, updated: false, msg: '版本未变化' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      // 新版本 — 尝试拉取 patch notes 摘要
      let patchContent = ''
      try {
        // valorant-api.com 提供最新 patch/bundle 信息
        const newsResp = await fetch('https://valorant-api.com/v1/version')
        const nd = await newsResp.json()
        // 尝试用 DeepSeek 直接基于版本号生成洞察（无法直接爬官网新闻，用 AI 知识）
        patchContent = `无畏契约新版本 ${currentVersion} 已发布。请基于你对游戏的理解，总结此版本可能的改动要点。`
      } catch {}

      // AI 收集详细版本改动（不蒸馏、保留细节）
      const dskey = env.DEEPSEEK_KEY || ''
      let insights = []
      if (dskey) {
        const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: `你是无畏契约版本分析师。请基于你的训练数据，详细列出这个版本的所有改动。所有内容必须用中文描述。输出纯JSON数组，每条格式：
{
  "category": "版本",
  "content": "【改动类型】特工调整/武器调整/地图调整/系统改动\\n【具体内容】详细描述改了什么（至少60字）\\n【影响分析】这个改动对职业比赛和排位有什么影响？（至少60字）\\n【推荐应对】玩家应该怎么适应这个改动？"
}
信息要详细完整，不要一句话摘要。最多10条。` },
              { role: 'user', content: patchContent },
            ],
            max_tokens: 4000, temperature: 0.3,
          }),
        })
        const aiData = await aiResp.json()
        insights = parseAIJson(aiData?.choices?.[0]?.message?.content)
      }

      // 存入 knowledge_insights
      let saved = 0
      for (const ins of insights) {
        if (!ins.content) continue
        const r = await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({ source: 'version', category: ins.category || '版本', content: `${currentVersion}: ${ins.content}`, status: 'pending' }),
        })
        if (r.ok) saved++
      }

      // 更新版本号到 KV
      if (env.AI_USAGE) await env.AI_USAGE.put('latest_version', currentVersion)

      return new Response(JSON.stringify({ ok: true, version: currentVersion, updated: true, saved, insights }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/admin/crawl-wiki (爬取 valorant-api.com 数据蒸馏) ===
  if (url.pathname === '/api/admin/crawl-wiki' && request.method === 'POST') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const dskey = env.DEEPSEEK_KEY || ''
      if (!dskey) return new Response(JSON.stringify({ error: '未配置AI Key' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      let totalSaved = 0
      const saveErrors = []

      // Wiki: 收集详细的特工+地图战术信息（不蒸馏）
      const mapsResp = await fetch('https://valorant-api.com/v1/maps?language=zh-CN')
      const mapsData = await mapsResp.json()
      const playableMaps = (mapsData?.data || []).filter(m => m.coordinates).map(m => m.displayName)

      const topics = [
        { cat: '特工', prompt: `为无畏契约10个核心特工提供详细战术指南。JSON数组格式：
{
  "category": "特工",
  "content": "【特工名】XXX\\n【定位】决斗者/控场者/先锋/哨兵\\n【核心技能】XXX\\n【进攻方怎么用】详细说明（至少60字）\\n【防守方怎么用】详细说明（至少60字）\\n【常见配合】和哪些特工配合好？为什么？"
}
只输出纯JSON数组，每个特工1条，最多10条。信息要详细，不要压缩。` },
        { cat: '地图', prompt: `为以下无畏契约地图提供详细战术分析：${playableMaps.join('、')}。JSON数组格式：
{
  "category": "地图",
  "content": "【地图名】XXX\\n【地图特点】这张图的独特之处（至少40字）\\n【进攻方策略】A点和B点分别怎么打？（至少80字）\\n【防守方策略】怎么布防？关键守点在哪？（至少80字）\\n【职业赛常见打法】职业队在这张图上怎么打？为什么？"
}
只输出纯JSON数组，每张地图1条，信息要详细，不要压缩。` },
      ]

      const results = await Promise.all(topics.map(t =>
        fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash', max_tokens: 4000, temperature: 0.3,
            messages: [
              { role: 'system', content: '你是无畏契约战术分析师。请提供详细、完整的战术信息，包含具体用法、原因分析和配合建议。所有内容必须用中文描述。信息越详细越好，不要摘要。输出纯JSON数组。\n\n${GAME_DATA}' },
              { role: 'user', content: t.prompt },
            ],
          }),
        }).then(r => r.json()).then(data => parseAIJson(data?.choices?.[0]?.message?.content).map(ins => ({ ...ins, cat: t.cat }))).catch(() => [])
      ))

      for (const topicInsights of results) {
        for (const ins of topicInsights) {
          if (!ins.content) continue
          const r = await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
            method: 'POST', headers: SB_HEADERS_POST,
            body: JSON.stringify({ source: 'wiki', category: ins.category || ins.cat, content: ins.content, status: 'pending' }),
          })
          if (r.ok) { totalSaved++ }
          else {
            const errText = await r.text().catch(() => '')
            console.error('[wiki] save failed:', r.status, errText)
            saveErrors.push(`[${r.status}] ${errText.slice(0, 80)}`)
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, saved: totalSaved, maps: playableMaps.length, errors: saveErrors.length > 0 ? saveErrors : undefined }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/admin/vct-insights (基于AI训练数据生成VCT赛事洞察) ===
  if (url.pathname === '/api/admin/vct-insights' && request.method === 'POST') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const dskey = env.DEEPSEEK_KEY || ''
      if (!dskey) return new Response(JSON.stringify({ error: '未配置AI Key' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      let totalSaved = 0
      const saveErrors = []

      // VCT: 收集完整职业比赛数据（每张地图 → 高选取率阵容 → 特工分析 → 配合套路 → 比赛来源）
      const vctPrompts = [
        { cat: 'VCT阵容', prompt: `为VCT职业比赛中5张核心地图（Bind、Ascent、Haven、Split、Lotus、Pearl、Fracture、Breeze、Icebox、Sunset、Abyss 中选5张），每张地图列出2-3套选取率最高的阵容。

对每套阵容，按以下格式输出JSON（每条一条）：

{
  "category": "VCT阵容",
  "content": "【地图】具体地图名\\n【阵容名称】给这套阵容起个名\\n【选取率】在职业比赛中这套阵容的选取率（大致百分比）\\n【特工组成】逐一列出5个特工的中文全名\\n【阵容类型】速攻/慢控/双烟/双先锋/双决斗 等\\n【每个特工的作用】\\n  - 特工A：(写出该特工在这套阵容里的具体任务和打法)\\n  - 特工B：(同上)\\n  - 特工C：(同上)\\n  - 特工D：(同上)\\n  - 特工E：(同上)\\n【特工之间的配合套路】至少写出2组特工间的小套路或技能组合（如：蝰蛇毒幕+猎枭无人机标记穿烟击杀）\\n【阵容优势】这套阵容在这张地图上为什么强？\\n【阵容弱点】这套阵容怕什么？被什么克制？\\n【来源比赛】这套阵容最近一次出现是哪场比赛？写清楚谁打谁、什么赛事、谁赢了"
}

重要规则：
- 所有特工名必须用中文全称，不能写"某特工""一个决斗者"之类的模糊表述
- 每张地图至少2套阵容
- 每套阵容必须列出5个特工并逐一分析作用
- 配合套路必须写至少2组，说清楚谁和谁配合、怎么配合
- 来源比赛必须写具体队名和胜负
只输出纯JSON数组，最多10条，不要markdown包裹。` },
        { cat: 'VCT战术', prompt: `请回忆VCT职业比赛中5个经典的攻防战术回合，每回合必须包含：

{
  "category": "VCT战术",
  "content": "【来源比赛】哪两个队伍打的？什么赛事？谁赢了？\\n【地图】具体地图名\\n【进攻方阵容】5个特工中文全名\\n【防守方阵容】5个特工中文全名\\n【回合背景】第几回合？比分多少？攻方还是守方？经济情况（有钱/没钱/强起）\\n【战术执行过程】\\n  - 谁先手？用了什么技能？\\n  - 队员之间怎么配合推进的？\\n  - 关键技能释放顺序是什么？\\n  - 写清楚每个特工在这个回合里做了什么（至少150字）\\n【结果】这回合谁赢了？对于整场比赛产生了什么影响？\\n【战术分析】这个战术为什么成功/失败？如果是你，你会怎么改进？"
}

重要规则：
- 每个特工必须写中文全名，技能写具体名称
- 回合过程要按时间顺序写清楚
- 结果要写明谁赢、赢了之后的连锁反应
只输出纯JSON数组，最多5条，不要markdown包裹。` },
        { cat: 'VCT地图', prompt: `为VCT职业比赛中的5张地图做详细分析，每张地图包含：

{
  "category": "VCT地图",
  "content": "【地图名】具体地图名\\n【职业选取情况】这张图在最近VCT比赛中的选取率/禁用率\\n【进攻方强势阵容TOP2】\\n  阵容1：列出5个特工全名 + 为什么这套强？\\n  阵容2：列出5个特工全名 + 为什么这套强？\\n【防守方强势阵容TOP2】\\n  阵容1：列出5个特工全名 + 为什么这套强？\\n  阵容2：列出5个特工全名 + 为什么这套强？\\n【A点进攻战术】进攻方打A点常用什么战术？（如慢推控制、快速Rush、假打转点等）列出关键特工和技能顺序（至少80字）\\n【A点防守战术】防守方A点怎么布防？用什么战术守？哪个特工守关键位置？（至少80字）\\n【B点进攻战术】进攻方打B点常用什么战术？和A点有什么不同？（至少80字）\\n【B点防守战术】防守方B点怎么布置？和A点的战术区别是什么？（至少80字）\\n【中路控制战术】中路在这张图的战术地位？由谁控中？用什么技能控制？（至少60字）\\n【最新职业趋势】最近比赛中这张图有什么新打法、新战术或阵容变化？\\n【参考比赛】至少列出2场经典职业比赛（写清楚谁打谁、谁赢了、用了什么战术）"
}

重要规则：
- 所有特工必须写中文全称
- 阵容必须写满5个特工
- 参考比赛必须写具体队名和结果
只输出纯JSON数组，最多5条，不要markdown包裹。` },
      ]

      const results = await Promise.all(vctPrompts.map(t =>
        fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: '你是VCT职业比赛战术分析师。请输出详细、完整的战术信息，必须包含：地图名称、双方完整阵容（5个特工中文全名）、使用的具体战术名称和打法、特工之间的配合套路、来源比赛（谁打谁谁赢了）。所有内容必须用中文描述，禁止使用"某个""某人"等模糊表述。信息越详细越好，不要压缩。输出纯JSON数组。\n\n${GAME_DATA}' },
              { role: 'user', content: t.prompt },
            ],
            max_tokens: 4000, temperature: 0.3,
          }),
        }).then(r => r.json()).then(data => {
          return parseAIJson(data?.choices?.[0]?.message?.content).map(ins => ({ ...ins, cat: t.cat }))
        }).catch(() => [])
      ))

      for (const topicInsights of results) {
        for (const ins of topicInsights) {
          if (!ins.content) continue
          const r = await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
            method: 'POST', headers: SB_HEADERS_POST,
            body: JSON.stringify({ source: 'vct', category: ins.category || ins.cat, content: ins.content, status: 'pending' }),
          })
          if (r.ok) { totalSaved++ }
          else {
            const errText = await r.text().catch(() => '')
            console.error('[vct] save failed:', r.status, errText)
            saveErrors.push(`[${r.status}] ${errText.slice(0, 80)}`)
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, saved: totalSaved, errors: saveErrors.length > 0 ? saveErrors : undefined }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/admin/distill (蒸馏对话提取洞察) ===
  if (url.pathname === '/api/admin/distill' && request.method === 'POST') {
    // 支持 query ?key=xxx 和 body { key } 两种方式
    let body = {}
    try { body = await request.json() } catch {}
    const key = new URL(request.url).searchParams.get('key') || body.key || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const dskey = env.DEEPSEEK_KEY || ''
      if (!dskey) return new Response(JSON.stringify({ ok: true, count: 0, msg: '未配置AI Key' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      let userMsgs = ''

      // 单条蒸馏模式：前端传了 conversationContent
      if (body.conversationContent) {
        userMsgs = String(body.conversationContent).slice(0, 8000)
      } else {
        // 批量模式：取最近 100 条对话
        const logsResp = await fetch(`${SB_URL}/rest/v1/conversation_logs?select=content,role&order=created_at.desc&limit=100`, { headers: SB_HEADERS_POST })
        const logs = await logsResp.json()
        if (!logs.length) return new Response(JSON.stringify({ ok: true, count: 0, msg: '无对话数据' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        userMsgs = logs.filter((l) => l.role === 'user').map((l) => l.content).join('\n').slice(0, 8000)
      }

      if (!userMsgs.trim()) return new Response(JSON.stringify({ ok: true, count: 0, msg: '无有效内容' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 从对话中提取完整战术信息（不蒸馏）
      const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: `你是一个战术知识提取器。从以下用户与AI教练的对话中，提取所有有价值的战术信息。所有内容必须用中文描述。
输出纯JSON数组，每条格式：
{
  "category": "地图/特工/阵容/武器/经济/技巧",
  "content": "【主题】XXX\\n【详细内容】从对话中提取的完整战术信息（至少80字，不要压缩）\\n【适用场景】什么情况下可以用？\\n【来源】基于对话中提到的地图/特工/阵容"
}
只提取有实质内容的信息，保留原文细节，不要做摘要压缩。最多10条。` },
            { role: 'user', content: userMsgs },
          ],
          max_tokens: 4000, temperature: 0.3,
        }),
      })
      const aiData = await aiResp.json()
      const insights = parseAIJson(aiData?.choices?.[0]?.message?.content)

      // 存入 insights
      let saved = 0
      for (const ins of insights) {
        if (!ins.content) continue
        const r = await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({ source: 'conversation', category: ins.category || '战术', content: ins.content, status: 'pending' }),
        })
        if (r.ok) saved++
      }
      return new Response(JSON.stringify({ ok: true, count: saved, insights }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/log/conversation (匿名对话日志) ===
  if (url.pathname === '/api/log/conversation' && request.method === 'POST') {
    try {
      const { userHash, model, messages, context } = await request.json()
      if (!userHash || !messages?.length) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      for (const msg of messages) {
        await fetch(`${SB_URL}/rest/v1/conversation_logs`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({
            user_hash: userHash.slice(0, 64), model: model || '', role: msg.role,
            content: (msg.content || '').slice(0, 2000),
            context: context ? JSON.stringify(context) : null,
          }),
        })
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  let { apiKey, provider, model, messages, userId } = await request.json()

  const p = PROVIDERS[provider]
  if (!p) return new Response(JSON.stringify({ error: '未知厂商' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

  // 如果没有用户 Key，用服务端 Key（免费模式）
  const isFree = !apiKey
  if (isFree) {
    apiKey = getServerKey(provider, env)
    if (!apiKey) return new Response(JSON.stringify({ error: '该厂商暂不支持免费使用，请自备 API Key' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // 模型列表
  if (url.pathname === '/api/models') {
    try {
      const models = await p.listModels(apiKey)
      return new Response(JSON.stringify({ models, freeMode: isFree }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // AI 对话 — IP 限流（防滥用，所有用户生效）
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  const rateStatus = await checkRateLimit(ip, env)
  if (rateStatus === 429) {
    return new Response(JSON.stringify({ error: 'rate_limit', message: '请求过快，请稍后再试' }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // AI 对话 — 免费额度检查（付费用户不受限）
  if (isFree && userId && env.AI_USAGE) {
    let isPaid = false
    try {
      const userTier = await env.AI_USAGE.get(`tier:${userId}`, { type: 'json' })
      isPaid = userTier?.tier && userTier.tier !== 'free'
    } catch {}
    if (!isPaid) {
      // 免费用户：共享 5 次/天
      const today = new Date().toISOString().slice(0, 10)
      const key = `usage:${userId}:${today}`
      const count = parseInt(await env.AI_USAGE.get(key) || '0')
      if (count >= FREE_LIMIT) {
        return new Response(JSON.stringify({ error: 'free_limit', message: `今日免费次数已用完（${FREE_LIMIT}次/天），请升级套餐或自备 API Key` }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      await env.AI_USAGE.put(key, String(count + 1), { expirationTtl: 86400 })
    } else {
      // 付费用户：按模型独立计数
      const modelLimit = MODEL_LIMITS[model] || 60
      const today = new Date().toISOString().slice(0, 10)
      const key = `usage:${userId}:${today}:${model}`
      const count = parseInt(await env.AI_USAGE.get(key) || '0')
      if (count >= modelLimit) {
        return new Response(JSON.stringify({ error: 'free_limit', message: `今日该模式次数已用完（${modelLimit}次/天）` }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      await env.AI_USAGE.put(key, String(count + 1), { expirationTtl: 86400 })
    }
  }

  try {
    const chatUrl = typeof p.chatUrl === 'function' ? p.chatUrl(model) : p.chatUrl

    const resp = await fetch(chatUrl, {
      method: 'POST',
      headers: p.chatHeaders(apiKey),
      body: JSON.stringify(p.chatBody(model, messages)),
    })

    const data = await resp.json()
    // 注入免费模式标识
    if (isFree) data._free = true
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }
}
