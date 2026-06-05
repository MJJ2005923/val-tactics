/**
 * Pages Function: /api/ai | /api/models | /api/health
 * 部署时自动随 Cloudflare Pages 上线
 */

const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-7-20250416', name: 'Claude Opus 4.7' },
]

const PROVIDERS = {
  anthropic: {
    chatUrl: 'https://api.anthropic.com/v1/messages',
    listModels: async () => ANTHROPIC_MODELS,
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
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      const data = await r.json()
      return (data.models || []).filter(m => m.name.includes('gemini')).map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name })).slice(0, 30)
    },
    chatHeaders: () => ({ 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 2048 },
    }),
    keyInQuery: true,
  },
  deepseek: {
    chatUrl: 'https://api.deepseek.com/v1/chat/completions',
    listModels: async () => [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
    ],
    chatHeaders: (key) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' }),
    chatBody: (model, messages) => ({ model, max_tokens: 2048, messages }),
  },
}

export async function onRequest(context) {
  const { request } = context
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

  const { apiKey, provider, model, messages } = await request.json()

  const p = PROVIDERS[provider]
  if (!p) return new Response(JSON.stringify({ error: '未知厂商' }), { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } })

  // 模型列表
  if (url.pathname === '/api/models') {
    try {
      const models = await p.listModels(apiKey)
      return new Response(JSON.stringify({ models }), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
    }
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
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'content-type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } })
  }
}
