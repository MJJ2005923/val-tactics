import { useState, useEffect, useCallback } from 'react'
import styles from './AIPanel.module.css'

interface AIModel { id: string; name: string; tier?: string; perf?: string }
interface AIConfig { apiKey: string; provider: string; model: string }

const PROVIDER = 'deepseek'

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

export default function AISettings() {
  const [config, setConfig] = useState(loadConfig)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)

  const isFree = !config.apiKey

  useEffect(() => { saveConfig(config) }, [config])

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

  return (
    <div className={styles.settings}>
      <h3 className={styles.title}>⚡ 智能模式</h3>

      {isFree && <div className={styles.freeBadge}>🎉 免费 · 快速模式 · 每天 3 次</div>}

      {models.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {models.map(m => {
            const isFreeModel = m.tier === '免费可用'
            const locked = isFreeModel ? false : isFree
            return (
              <button key={m.id}
                onClick={() => !locked && setConfig((c: AIConfig) => ({ ...c, model: m.id }))}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px', marginBottom: 4,
                  border: `1px solid ${config.model === m.id ? '#ff4655' : '#1a1a2e'}`,
                  borderRadius: 6, background: config.model === m.id ? '#121222' : 'transparent',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.45 : 1,
                  color: '#ddd', fontSize: 13,
                }}>
                {m.name}
                {isFreeModel && <span style={{ color: '#4ade80', marginLeft: 6, fontSize: 11 }}>免费</span>}
                {locked && <span style={{ color: '#f0c850', marginLeft: 6, fontSize: 11 }}>🔒</span>}
                {m.perf && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{m.perf}</div>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className={styles.hint} style={{ marginBottom: 12 }}>{loadingModels ? '加载中...' : '加载模式...'}</div>
      )}

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
          <div className={styles.freeBadge} style={{ color: '#ff4655', background: 'rgba(255,70,85,0.08)', borderColor: 'rgba(255,70,85,0.2)' }}>
            🔑 自备 Key · 已解锁
          </div>
          <button className={styles.toggleBtn} onClick={() => { setConfig((c: AIConfig) => ({ ...c, apiKey: '' })); setModels([]); setTimeout(() => fetchModels(), 100) }}
            style={{ width: '100%', padding: 8, fontSize: 12, marginTop: 6 }}>
            ← 切换免费模式
          </button>
        </div>
      )}
    </div>
  )
}
