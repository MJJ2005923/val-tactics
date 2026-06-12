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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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

  // 开发环境测试激活码（KV 不可用时的 fallback）
  const isDev = env.CF_PAGES_BRANCH === 'dev' || !env.CF_PAGES
  const DEV_CODES = isDev ? {
    'TEST-BASIC':    { tier: 'basic',    expiresAt: 0 },
    'TEST-ADVANCED': { tier: 'advanced', expiresAt: 0 },
    'TEST-PRO':      { tier: 'pro',      expiresAt: 0 },
    'TEST-OWNKEY':   { tier: 'ownkey',   expiresAt: 0 },
    'TEST-FREE':     { tier: 'free',     expiresAt: 0 },
    'TEST-NO-OWNKEY':  { tier: 'free',   expiresAt: 0 },
  } : {}

  // 免邮件注册（绕过 SMTP）
  if (url.pathname === '/api/signup') {
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
          return new Response(JSON.stringify({ ok: true, tier: DEV_CODES[normalized].tier, expiresAt: 0, dev: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
        return new Response(JSON.stringify({ error: '激活码无效' }), { status: 404, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      if (codeData.used && codeData.usedBy !== userId) {
        return new Response(JSON.stringify({ error: '激活码已被使用' }), { status: 409, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      // 标记使用
      await env.AI_USAGE.put(`code:${normalized}`, JSON.stringify({ ...codeData, used: true, usedBy: userId, usedAt: Date.now() }))
      // 存储用户套餐
      const userTier = { tier: codeData.tier, activatedAt: Date.now(), expiresAt: codeData.expiresAt || 0 }
      await env.AI_USAGE.put(`tier:${userId}`, JSON.stringify(userTier))
      return new Response(JSON.stringify({ ok: true, tier: codeData.tier, expiresAt: codeData.expiresAt }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
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

  // 管理后台：用户统计（需 ADMIN_KEY）
  if (url.pathname === '/api/admin/stats') {
    const key = new URL(request.url).searchParams.get('key') || ''
    if (key !== env.ADMIN_KEY || !env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
    try {
      const svcKey = env.SUPABASE_SERVICE_KEY || ''
      // 查 Supabase 用户总数
      const userResp = await fetch('https://zwtpeyvqbllrpregjpyd.supabase.co/auth/v1/admin/users?per_page=1', {
        headers: { 'apikey': svcKey, 'Authorization': `Bearer ${svcKey}` }
      })
      const totalUsers = userResp.headers.get('x-total-count') || userResp.headers.get('content-range')?.split('/')[1] || '?'
      // 查 KV 中的激活统计
      let tierCounts = { free: 0, basic: 0, advanced: 0, pro: 0, ownkey: 0 }
      if (env.AI_USAGE) {
        const tierList = await env.AI_USAGE.list({ prefix: 'tier:' })
        for (const k of tierList.keys) {
          try {
            const t = await env.AI_USAGE.get(k.name, { type: 'json' })
            const tier = t?.tier || 'free'
            tierCounts[tier] = (tierCounts[tier] || 0) + 1
          } catch {}
        }
        tierCounts.ownkey = tierList.keys.filter(k => k.name.includes(':ownkey')).length // 估算
      }
      return new Response(JSON.stringify({
        totalUsers: parseInt(totalUsers) || 0,
        tierCounts,
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
          return new Response(JSON.stringify({ allowed: false, level: 'review', reason: verdict, flags: ['ai_review'] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
      } catch {} // AI 不可用时降级为通过（已过词库）
    }

    return new Response(JSON.stringify({ allowed: true, level: 'pass', reason: '审核通过', flags: [] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }

  // ====================================================================
  // 房间协作 API（service_key 绕过 RLS）
  // ====================================================================
  const SB_URL = 'https://zwtpeyvqbllrpregjpyd.supabase.co'
  const SB_KEY = env.SUPABASE_SERVICE_KEY || ''
  const SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }
  const MAX_ROOMS = 3
  const MAX_MEMBERS = 8
  const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  function genCode() {
    let c = ''
    for (let i = 0; i < 6; i++) c += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]
    return c
  }

  // 检查用户套餐（从 KV，不可篡改）
  async function checkTier(userId) {
    if (!env.AI_USAGE) {
      // 本地开发无 KV：查 Supabase
      try {
        const r = await fetch(`${SB_URL}/rest/v1/user_tiers?user_id=eq.${userId}&select=tier`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
        if (r.ok) {
          const data = await r.json()
          if (data[0]) return { tier: data[0].tier }
        }
      } catch {}
      // 本地开发兜底：放行（允许测试协作功能）
      return { tier: 'standard' }
    }
    try {
      const t = await env.AI_USAGE.get(`tier:${userId}`, { type: 'json' })
      if (t) return t
    } catch {}
    return { tier: 'free' }
  }

  // === POST /api/room/create ===
  if (url.pathname === '/api/room/create' && request.method === 'POST') {
    try {
      const { userId, mapId, side } = await request.json()
      if (!userId) return new Response(JSON.stringify({ error: '缺少userId' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 1. 套餐检查
      const tierData = await checkTier(userId)
      if (tierData.tier === 'free' || tierData.tier === 'ownkey') {
        return new Response(JSON.stringify({ room: null, error: '请先升级到标准套餐（¥30/月）' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      // 2. 房间数量检查
      const countResp = await fetch(`${SB_URL}/rest/v1/rooms?host_id=eq.${userId}&status=eq.open&select=id`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
      if (countResp.ok) {
        const rooms = await countResp.json()
        if (rooms.length >= MAX_ROOMS) {
          return new Response(JSON.stringify({ room: null, error: `最多创建${MAX_ROOMS}个活跃房间` }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
        }
      }

      // 3. 生成唯一房间码
      let code = ''
      for (let i = 0; i < 20; i++) {
        code = genCode()
        const check = await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}&select=id`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
        const existing = await check.json()
        if (!existing.length) break
        if (i === 19) return new Response(JSON.stringify({ room: null, error: '生成房间码失败，请重试' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      // 4. 创建房间 + 成员
      const r = await fetch(`${SB_URL}/rest/v1/rooms`, {
        method: 'POST', headers: SB_HEADERS,
        body: JSON.stringify({ id: code, host_id: userId, editor_id: userId, map_id: mapId || 'ascent', side: side || 'attack' }),
      })
      if (!r.ok) {
        const err = await r.text()
        return new Response(JSON.stringify({ room: null, error: `创建失败：${err}` }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      await fetch(`${SB_URL}/rest/v1/room_members`, {
        method: 'POST', headers: SB_HEADERS,
        body: JSON.stringify({ room_id: code, user_id: userId, role: 'host' }),
      })

      const room = (await r.json())[0]
      return new Response(JSON.stringify({ room: { id: room.id, host_id: room.host_id, editor_id: room.editor_id, map_id: room.map_id, side: room.side, status: room.status } }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ room: null, error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/room/join ===
  if (url.pathname === '/api/room/join' && request.method === 'POST') {
    try {
      const { roomId, userId } = await request.json()
      if (!roomId || !userId) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

      const code = roomId.toUpperCase().trim()

      // 查房间
      const roomResp = await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}&status=eq.open&select=*`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
      console.log('[room/join] rooms query:', roomResp.status, await roomResp.clone().text())
      if (!roomResp.ok) {
        return new Response(JSON.stringify({ error: `查询房间失败(${roomResp.status})` }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      const rooms = await roomResp.json()
      if (!rooms.length) return new Response(JSON.stringify({ error: '房间不存在或已关闭' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 查人数
      const cntResp = await fetch(`${SB_URL}/rest/v1/room_members?room_id=eq.${code}&select=user_id`, { headers: { ...SB_HEADERS, 'Accept': 'application/json', 'Prefer': 'count=exact' } })
      const cntHeader = cntResp.headers.get('content-range')
      const count = cntHeader ? parseInt(cntHeader.split('/')[1]) : 99
      if (count >= MAX_MEMBERS) return new Response(JSON.stringify({ error: '房间已满（最多8人）' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 加入
      const joinResp = await fetch(`${SB_URL}/rest/v1/room_members`, {
        method: 'POST', headers: SB_HEADERS,
        body: JSON.stringify({ room_id: code, user_id: userId, role: 'member' }),
      })
      if (!joinResp.ok && joinResp.status !== 409) {
        const err = await joinResp.text()
        return new Response(JSON.stringify({ error: `加入失败：${err}` }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      return new Response(JSON.stringify({ room: rooms[0] }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/room/leave ===
  if (url.pathname === '/api/room/leave' && request.method === 'POST') {
    try {
      const { roomId, userId } = await request.json()
      if (!roomId || !userId) return new Response(JSON.stringify({ error: '缺少参数' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

      const code = roomId.toUpperCase().trim()

      // 查当前房间
      const rResp = await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}&select=*`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
      const rData = await rResp.json()
      const room = rData[0]
      if (!room) return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 删除成员
      await fetch(`${SB_URL}/rest/v1/room_members?room_id=eq.${code}&user_id=eq.${userId}`, { method: 'DELETE', headers: SB_HEADERS })

      // 如果离开的是房主，转让或关闭
      if (room.host_id === userId) {
        const memResp = await fetch(`${SB_URL}/rest/v1/room_members?room_id=eq.${code}&select=user_id&order=joined_at.asc&limit=1`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
        const members = await memResp.json()
        if (members.length > 0) {
          await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}`, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify({ host_id: members[0].user_id, editor_id: members[0].user_id }) })
        } else {
          await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}`, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify({ status: 'closed' }) })
        }
      } else if (room.editor_id === userId) {
        // 离开的是编辑者，归还房主
        await fetch(`${SB_URL}/rest/v1/rooms?id=eq.${code}`, { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify({ editor_id: room.host_id }) })
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  }

  // === POST /api/room/check-permission ===
  if (url.pathname === '/api/room/check-permission' && request.method === 'POST') {
    try {
      const { userId } = await request.json()
      if (!userId) return new Response(JSON.stringify({ allowed: false, reason: '请先登录' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      const tierData = await checkTier(userId)
      if (tierData.tier === 'free') return new Response(JSON.stringify({ allowed: false, reason: '请先升级到标准套餐（¥30/月）' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      if (tierData.tier === 'ownkey') return new Response(JSON.stringify({ allowed: false, reason: '自备Key套餐不含协作功能' }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })

      // 检查房间数
      const countResp = await fetch(`${SB_URL}/rest/v1/rooms?host_id=eq.${userId}&status=eq.open&select=id`, { headers: { ...SB_HEADERS, 'Accept': 'application/json' } })
      if (countResp.ok) {
        const rooms = await countResp.json()
        if (rooms.length >= MAX_ROOMS) return new Response(JSON.stringify({ allowed: false, reason: `最多创建${MAX_ROOMS}个活跃房间` }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }

      return new Response(JSON.stringify({ allowed: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
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
