import { useState, useEffect, useCallback } from 'react'
import { ModelIcon } from '../AIPage/AIPage'
import styles from './AIPanel.module.css'

interface AIModel { id: string; name: string; tier?: string; perf?: string; limit?: string; unlock?: string }

// 本地今日用量（按模型分开）
const USAGE_DATE = new Date().toISOString().slice(0,10)
function getTodayUsage(modelId?: string): number {
  try { return parseInt(localStorage.getItem(`val-tactics-usage-${USAGE_DATE}${modelId ? `-${modelId}` : ''}`) || '0') } catch { return 0 }
}
function getSharedUsage(): number {
  return getTodayUsage('deepseek-v4-flash') + getTodayUsage('deepseek-chat')
}
interface AIConfig { apiKey: string; provider: string; model: string }

const PROVIDER = 'deepseek'

// 套餐对应的解锁模型
const TIER_MODELS: Record<string, string[]> = {
  free: ['deepseek-v4-flash'],
  basic: ['deepseek-v4-flash', 'deepseek-chat'],
  advanced: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro'],
  pro: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-pro'],
}

// 套餐对应每日限额
const TIER_LIMITS: Record<string, number> = {
  free: 5,
  basic: 30,
  advanced: 40,
  pro: 100,
}

// 套餐总次数 + 特殊模型限制（推理/深度有独立上限）
const MODEL_CAPS: Record<string, Record<string, number>> = {
  'deepseek-reasoner':  { advanced: 3, pro: 20 },
  'deepseek-v4-pro':    { advanced: 2, pro: 10 },
}

function loadConfig() {
  try { const raw = localStorage.getItem('val-tactics-ai-config'); if (raw) return JSON.parse(raw) } catch {}
  return { apiKey: '', provider: PROVIDER, model: '' }
}
function saveConfig(c: AIConfig) { localStorage.setItem('val-tactics-ai-config', JSON.stringify(c)) }
export function getAIConfig() { return loadConfig() }
function uid() {
  let id = localStorage.getItem('val-tactics-uid')
  if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }
  return id
}
export function getUserId() { return uid() }

/** 查询用户套餐 */
async function fetchTier(): Promise<string> {
  try {
    const resp = await fetch('/api/tier', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: uid() }),
    })
    if (resp.ok) {
      const data = await resp.json()
      return data.tier || 'free'
    }
  } catch {}
  return 'free'
}

/** 激活码兑换 */
async function activateCode(code: string): Promise<{ ok: boolean; tier?: string; error?: string }> {
  try {
    const resp = await fetch('/api/activate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), userId: uid() }),
    })
    const data = await resp.json()
    return data
  } catch {
    return { ok: false, error: '网络请求失败' }
  }
}

/** 判断模型是否对当前套餐可用 */
function isModelAvailable(tier: string, isFree: boolean, model: AIModel): boolean {
  if (!isFree) return true // 自备Key全解锁
  return TIER_MODELS[tier]?.includes(model.id) ?? false
}

export default function AISettings() {
  const [config, setConfig] = useState(loadConfig)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tier, setTier] = useState('free')
  const [actCode, setActCode] = useState('')
  const [actStatus, setActStatus] = useState('')

  const isFree = !config.apiKey
  const tierLabel = tier === 'free' ? '免费' : tier === 'basic' ? '基础' : tier === 'advanced' ? '进阶' : tier === 'pro' ? '专业' : '免费'

  useEffect(() => { saveConfig(config) }, [config])

  // 查询套餐状态
  useEffect(() => {
    if (isFree) {
      fetchTier().then(t => {
        if (t === 'free') {
          const local = (() => { try { return localStorage.getItem('val-tactics-tier') } catch { return null } })()
          if (local) t = local
        }
        setTier(t)
      })
    } else setTier('pro')
  }, [isFree])

  const fetchModels = useCallback(async () => {
    setLoadingModels(true)
    try {
      const resp = await fetch('/api/models', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: PROVIDER }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.models?.length > 0) {
          setModels(data.models)
          if (!config.model || !data.models.find((m: AIModel) => m.id === config.model)) {
            setConfig((c: AIConfig) => ({ ...c, model: data.models[0].id }))
          }
        }
      }
    } catch {}
    setLoadingModels(false)
  }, [config.apiKey])

  useEffect(() => { fetchModels() }, [fetchModels])

  const saveKey = () => {
    setConfig((c: AIConfig) => ({ ...c, apiKey: keyInput }))
    setTimeout(() => fetchModels(), 100)
  }

  const handleActivate = async () => {
    if (!actCode.trim()) return
    if (!isFree && !config.apiKey) { setActStatus('❌ 请先注册/登录账号'); return }
    setActStatus('验证中...')
    const result = await activateCode(actCode)
    if (result.ok) {
      setTier(result.tier || 'free')
      localStorage.setItem('val-tactics-tier', result.tier || 'free')
      setActStatus(`✅ 激活成功！当前套餐：${result.tier}`)
      setActCode('')
    } else {
      setActStatus(`❌ ${result.error || '激活失败'}`)
    }
  }

  return (
    <div className={styles.settings}>
      <h3 className={styles.title}>模式选择</h3>

      {/* 套餐状态 */}
      {isFree ? (
        <div className={styles.freeBadge} style={{ marginBottom: 10 }}>
          {tier === 'free' ? `🎉 免费套餐 · 剩余 ${Math.max(0, 5 - getSharedUsage())} 次` : `✅ ${tierLabel}套餐 · ${TIER_LIMITS[tier]}次/天`}
        </div>
      ) : (
        <div className={styles.freeBadge} style={{ background: 'rgba(227,73,237,.08)', borderColor: 'rgba(227,73,237,.2)', color: '#f0a0f0' }}>
          🔑 自备 Key · 全部已解锁
        </div>
      )}

      {/* 模型列表 */}
      {models.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {models.map(m => {
            const locked = isFree && !isModelAvailable(tier, isFree, m)
            const tierLimit = isFree ? TIER_LIMITS[tier] : Infinity
            const cap = MODEL_CAPS[m.id]?.[tier]
            const usage = cap !== undefined ? getTodayUsage(m.id) : getSharedUsage()
            const remaining = Math.max(0, (cap ?? tierLimit) - usage)
            const modelLimit = isFree ? `剩余 ${remaining} 次` : `${cap ?? tierLimit}次/天`
            return (
              <button key={m.id}
                onClick={() => !locked && setConfig((c: AIConfig) => ({ ...c, model: m.id }))}
                className={`${styles.modelBtn} ${config.model === m.id ? styles.modelBtnActive : ''} ${locked ? styles.modelBtnLocked : ''}`}>
                <div className={styles.modelRow}>
                  <ModelIcon modelId={m.id} size={22} />
                  <span>{m.name.replace(/^[^\w一-鿿]+/, '').trim()}</span>
                  {m.unlock && (
                    <span className={`${styles.unlockTag} ${m.tier === '免费' ? styles.unlockFree : styles.unlockPaid}`}>
                      {m.unlock}
                    </span>
                  )}
                </div>
                {m.perf && <div className={styles.modelPerf}>{m.perf}</div>}
                <div className={styles.modelLimit}>
                  {locked ? '🔒 需升级套餐' : modelLimit || `${tierLimit}次/天`}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className={styles.hint} style={{ marginBottom: 12 }}>{loadingModels ? '加载中...' : '加载模式...'}</div>
      )}

      {/* 激活码输入 */}
      {isFree && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              className={styles.input}
              value={actCode}
              placeholder="输入激活码..."
              onChange={e => { setActCode(e.target.value); setActStatus('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleActivate() }}
              style={{ flex: 1 }}
            />
            <button className={styles.toggleBtn} onClick={handleActivate} style={{ whiteSpace: 'nowrap', padding: '6px 10px' }}>
              激活
            </button>
          </div>
          {actStatus && (
            <div style={{ fontSize: 11, color: actStatus.includes('✅') ? '#05F8F8' : '#E349ED', padding: '4px 0' }}>
              {actStatus}
            </div>
          )}
        </div>
      )}

      {/* 自备Key */}
      <div>
        {isFree ? (
          <div>
            <button className={styles.toggleBtn} onClick={() => setShowKeyInput(!showKeyInput)}
              style={{ width: '100%', padding: 8, fontSize: 12 }}>
              🔑 自备 Key 解锁全部
            </button>
            {showKeyInput && (
              <div className={styles.keyInput} style={{ marginTop: 6 }}>
                <input className={styles.input} type="password" value={keyInput}
                  placeholder="粘贴 API Key..." onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveKey() }} />
                <button className={styles.toggleBtn} onClick={saveKey}>✓</button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className={styles.keyBadge}>🔑 自备 Key · 已解锁</div>
            <button className={styles.toggleBtn} onClick={() => { setConfig((c: AIConfig) => ({ ...c, apiKey: '' })); setTimeout(() => fetchModels(), 100) }}
              style={{ width: '100%', padding: 8, fontSize: 12, marginTop: 6 }}>
              ← 切换免费模式
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
