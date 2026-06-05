/**
 * AI 代理 Worker — 支持用户自带 Key + 服务端免费模式
 * 本地: npx wrangler dev --var DEEPSEEK_KEY:sk-xxx
 * 部署: npx wrangler deploy
 */

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
    { id: 'o4-mini', name: 'o4-mini (推理)', tier: '推理' },
  ],
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: '均衡' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: '旗舰' },
  ],
  deepseek: [
    { id: 'deepseek-v4-flash', name: '⚡ 快速模式', tier: '免费', perf: '日常问答 · 极速响应', limit: '2次/天', unlock: '免费可用' },
    { id: 'deepseek-chat', name: '⚖️ 均衡模式', tier: '基础', perf: '战术分析 · 阵容推荐', limit: '30次/天', unlock: '¥24.9/月' },
    { id: 'deepseek-v4-pro', name: '🧠 深度模式', tier: '专业', perf: '深度策略 · 复杂推演', limit: '5次/天', unlock: '¥49.9/月' },
    { id: 'deepseek-reasoner', name: '💭 推理模式', tier: '进阶', perf: '极致推理 · 职业分析', limit: '5次/天', unlock: '¥39.9/月' },
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
    listModels: async () => PRESET_MODELS.openai,
    chatHeaders: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
  google: {
    chatUrl: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    listModels: async () => PRESET_MODELS.google,
    chatHeaders: () => ({ 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 2048 },
    }),
    keyInQuery: true,
  },
  deepseek: {
    chatUrl: 'https://api.deepseek.com/v1/chat/completions',
    listModels: async () => PRESET_MODELS.deepseek,
    chatHeaders: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
}

// 免费额度
const FREE_LIMIT = 10

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

    const url = new URL(request.url)

    const path = url.pathname.replace('/api', '') || '/'

    if (path === '/health') {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }

    let { apiKey, provider, model, messages, userId } = await request.json()

    const p = PROVIDERS[provider]
    if (!p) return new Response(JSON.stringify({ error: '未知厂商' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

    // 免费模式：用服务端 Key
    const isFree = !apiKey
    if (isFree) {
      apiKey = env[provider.toUpperCase() + '_KEY'] || ''
      if (!apiKey) return new Response(JSON.stringify({ error: '该厂商暂不支持免费使用，请自备 API Key' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }

    // 模型列表
    if (path === '/models') {
      try {
        const models = await p.listModels(apiKey)
        return new Response(JSON.stringify({ models, freeMode: isFree }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      } catch (e) {
        return new Response(JSON.stringify({ models: PRESET_MODELS[provider] || [], freeMode: isFree }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
    }

    // 免费额度检查
    if (isFree && userId && env.AI_USAGE) {
      const today = new Date().toISOString().slice(0, 10)
      const key = `usage:${userId}:${today}`
      const count = parseInt(await env.AI_USAGE.get(key) || '0')
      if (count >= FREE_LIMIT) {
        return new Response(JSON.stringify({ error: 'free_limit', message: `今日免费次数已用完（${FREE_LIMIT}次/天），请自备 API Key 或明天再来` }), { status: 429, headers: { ...corsHeaders, 'content-type': 'application/json' } })
      }
      ctx.waitUntil(env.AI_USAGE.put(key, String(count + 1), { expirationTtl: 86400 }))
    }

    // AI 对话
    try {
      let chatUrl = typeof p.chatUrl === 'function' ? p.chatUrl(model) : p.chatUrl
      if (p.keyInQuery) chatUrl += `?key=${encodeURIComponent(apiKey)}`

      const resp = await fetch(chatUrl, {
        method: 'POST',
        headers: p.keyInQuery ? { 'content-type': 'application/json' } : p.chatHeaders(apiKey),
        body: JSON.stringify(p.chatBody(model, messages)),
      })

      const data = await resp.json()
      if (isFree) data._free = true
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
  },
}
