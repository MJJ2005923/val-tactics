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

  const SB_URL = 'https://zwtpeyvqbllrpregjpyd.supabase.co'
  const SB_KEY = env.SUPABASE_SERVICE_KEY || ''
  const SB_HEADERS_POST = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

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

      // AI 蒸馏 patch notes
      const dskey = env.DEEPSEEK_KEY || ''
      let insights = []
      if (dskey) {
        const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: '你是无畏契约版本分析师。请基于你的训练数据（截止2026年），总结这个版本的主要改动。输出纯JSON数组，每条格式：{"category":"版本","content":"具体改动（一句话）"}。只输出确定的信息，不确定的不要输出。最多8条。' },
              { role: 'user', content: patchContent },
            ],
            max_tokens: 500, temperature: 0.3,
          }),
        })
        const aiData = await aiResp.json()
        const raw = aiData.choices?.[0]?.message?.content?.trim() || '[]'
        try { insights = JSON.parse(raw) } catch {
          const match = raw.match(/\[[\s\S]*\]/)
          if (match) try { insights = JSON.parse(match[0]) } catch {}
        }
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

      // 爬取特工数据
      const agentsResp = await fetch('https://valorant-api.com/v1/agents?language=zh-CN&isPlayableCharacter=true')
      const agentsData = await agentsResp.json()
      const agents = (agentsData?.data || [])

      // 提取特工技能数据
      const agentSummary = agents.map((a) => ({
        name: a.displayName,
        role: a.role?.displayName || '',
        abilities: (a.abilities || []).map((ab) => ({
          name: ab.displayName, description: ab.description, slot: ab.slot,
        })),
      }))

      // AI 蒸馏特工洞察
      const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: '你是无畏契约数据分析师。从特工技能数据中提取有价值的战术知识。输出纯JSON数组，每条约30字，格式：{"category":"特工","content":"具体洞察"}。侧重技能组合、克制关系、使用技巧。最多15条。' },
            { role: 'user', content: JSON.stringify(agentSummary.slice(0, 15)).slice(0, 6000) },
          ],
          max_tokens: 600, temperature: 0.3,
        }),
      })
      const aiData = await aiResp.json()
      const raw = aiData.choices?.[0]?.message?.content?.trim() || '[]'
      let insights = []
      try { insights = JSON.parse(raw) } catch {
        const match = raw.match(/\[[\s\S]*\]/)
        if (match) try { insights = JSON.parse(match[0]) } catch {}
      }
      for (const ins of insights) {
        if (!ins.content) continue
        await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({ source: 'wiki', category: ins.category || '特工', content: ins.content, status: 'pending' }),
        })
        totalSaved++
      }

      // 爬取地图数据
      const mapsResp = await fetch('https://valorant-api.com/v1/maps?language=zh-CN')
      const mapsData = await mapsResp.json()
      const mapNames = (mapsData?.data || []).map((m) => m.displayName).join('、')

      const mapResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: '你了解无畏契约所有地图。输出纯JSON数组，每条：{"category":"地图","content":"地图名+战术要点（一句）"}。涵盖以下地图：' + mapNames + '。每个地图1-2条，侧重职业比赛常见打法。' },
            { role: 'user', content: '请为每张地图提供战术要点' },
          ],
          max_tokens: 500, temperature: 0.3,
        }),
      })
      const mapData2 = await mapResp.json()
      const raw2 = mapData2.choices?.[0]?.message?.content?.trim() || '[]'
      let mapInsights = []
      try { mapInsights = JSON.parse(raw2) } catch {
        const match = raw2.match(/\[[\s\S]*\]/)
        if (match) try { mapInsights = JSON.parse(match[0]) } catch {}
      }
      for (const ins of mapInsights) {
        if (!ins.content) continue
        await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({ source: 'wiki', category: '地图', content: ins.content, status: 'pending' }),
        })
        totalSaved++
      }

      return new Response(JSON.stringify({ ok: true, saved: totalSaved, agents: agents.length, maps: mapNames }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
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

      // VCT 阵容数据
      for (const topic of [
        { cat: '阵容', prompt: '请基于2025-2026 VCT职业比赛数据，列出无畏契约当前职业比赛主流阵容组合。每种阵容格式：{"category":"阵容","content":"阵容名+特工组合+适用地图+打法说明(30字以内)"}。输出纯JSON数组。最多6条。' },
        { cat: '地图', prompt: '请基于VCT职业比赛数据，列出无畏契约各地图的职业队选率排名和主流打法。格式：{"category":"地图","content":"地图名+选率+职业打法(30字)"}。输出纯JSON数组。最多6条。' },
        { cat: '技巧', prompt: '从VCT职业比赛中提取5条高端战术技巧。格式：{"category":"技巧","content":"具体技巧(30字)"}。侧重道具组合、协同配合、时间控制。输出纯JSON数组。' },
      ]) {
        const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: [
              { role: 'system', content: '你是无畏契约VCT赛事分析师。基于你的训练数据提供准确的职业比赛洞察。' + topic.prompt },
              { role: 'user', content: `请提供${topic.cat}相关的VCT职业比赛数据` },
            ],
            max_tokens: 500, temperature: 0.3,
          }),
        })
        const data = await resp.json()
        const raw = data.choices?.[0]?.message?.content?.trim() || '[]'
        let insights = []
        try { insights = JSON.parse(raw) } catch {
          const match = raw.match(/\[[\s\S]*\]/)
          if (match) try { insights = JSON.parse(match[0]) } catch {}
        }
        for (const ins of insights) {
          if (!ins.content) continue
          await fetch(`${SB_URL}/rest/v1/knowledge_insights`, {
            method: 'POST', headers: SB_HEADERS_POST,
            body: JSON.stringify({ source: 'vct', category: ins.category || topic.cat, content: ins.content, status: 'pending' }),
          })
          totalSaved++
        }
      }

      return new Response(JSON.stringify({ ok: true, saved: totalSaved }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/admin/distill (蒸馏对话提取洞察) ===
  if (url.pathname === '/api/admin/distill' && request.method === 'POST') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      // 取最近100条对话
      const logsResp = await fetch(`${SB_URL}/rest/v1/conversation_logs?select=content,role&order=created_at.desc&limit=100`, { headers: SB_HEADERS_POST })
      const logs = await logsResp.json()
      if (!logs.length) return new Response(JSON.stringify({ ok: true, count: 0, msg: '无对话数据' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 拼接对话
      const userMsgs = logs.filter((l) => l.role === 'user').map((l) => l.content).join('\n').slice(0, 8000)

      // DeepSeek 蒸馏
      const dskey = env.DEEPSEEK_KEY || ''
      if (!dskey) return new Response(JSON.stringify({ ok: true, count: 0, msg: '未配置AI Key' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      const aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dskey}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: '你是无畏契约战术数据提炼员。从用户对话中提取有价值的战术知识，只输出纯JSON数组，每条格式：{"category":"地图/特工/阵容/武器/经济/技巧","content":"具体洞察（一句话）"}。只输出有价值的、可验证的战术信息。最多10条。' },
            { role: 'user', content: userMsgs },
          ],
          max_tokens: 500, temperature: 0.3,
        }),
      })
      const aiData = await aiResp.json()
      const raw = aiData.choices?.[0]?.message?.content?.trim() || '[]'
      let insights = []
      try { insights = JSON.parse(raw) } catch {
        const match = raw.match(/\[[\s\S]*\]/)
        if (match) try { insights = JSON.parse(match[0]) } catch {}
      }

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
      const { userHash, model, messages } = await request.json()
      if (!userHash || !messages?.length) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      for (const msg of messages) {
        await fetch(`${SB_URL}/rest/v1/conversation_logs`, {
          method: 'POST', headers: SB_HEADERS_POST,
          body: JSON.stringify({ user_hash: userHash.slice(0, 64), model: model || '', role: msg.role, content: (msg.content || '').slice(0, 2000) }),
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
