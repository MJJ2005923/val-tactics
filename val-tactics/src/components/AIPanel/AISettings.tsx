import { useState, useEffect, useCallback } from 'react'
import styles from './AIPanel.module.css'

interface AIModel { id: string; name: string; tier?: string; perf?: string; limit?: string; unlock?: string }
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

      {isFree && <div className={styles.freeBadge}>🎉 免费 · 快速模式 · 2次/天</div>}

      {models.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          {models.map(m => {
            const locked = isFree && m.tier !== '免费'
            return (
              <button key={m.id}
                onClick={() => !locked && setConfig((c: AIConfig) => ({ ...c, model: m.id }))}
                className={`${styles.modelBtn} ${config.model === m.id ? styles.modelBtnActive : ''} ${locked ? styles.modelBtnLocked : ''}`}>
                <div className={styles.modelRow}>
                  <span>{m.name}</span>
                  {m.unlock && (
                    <span className={`${styles.unlockTag} ${m.tier === '免费' ? styles.unlockFree : styles.unlockPaid}`}>
                      {m.unlock}
                    </span>
                  )}
                </div>
                {m.perf && <div className={styles.modelPerf}>{m.perf}</div>}
                <div className={styles.modelLimit}>
                  {m.limit}{locked && ' 🔒'}
                </div>
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
          <div className={styles.keyBadge}>🔑 自备 Key · 已解锁</div>
          <button className={styles.toggleBtn} onClick={() => { setConfig((c: AIConfig) => ({ ...c, apiKey: '' })); setTimeout(() => fetchModels(), 100) }}
            style={{ width: '100%', padding: 8, fontSize: 12, marginTop: 6 }}>
            ← 切换免费模式
          </button>
        </div>
      )}
    </div>
  )
}
