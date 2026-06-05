import { useState, useEffect, useCallback } from 'react'
import styles from './AIPanel.module.css'

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', hint: 'console.anthropic.com' },
  { id: 'openai', name: 'OpenAI', icon: '⚡', hint: 'platform.openai.com' },
  { id: 'google', name: 'Google', icon: '🌐', hint: 'aistudio.google.com' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🐋', hint: 'platform.deepseek.com' },
]

interface AIModel { id: string; name: string }
interface AIConfig { apiKey: string; provider: string; model: string }

const API_BASE = '/api'

function loadConfig() {
  try {
    const raw = localStorage.getItem('val-tactics-ai-config')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { apiKey: '', provider: 'anthropic', model: '' }
}
function saveConfig(c: { apiKey: string; provider: string; model: string }) {
  localStorage.setItem('val-tactics-ai-config', JSON.stringify(c))
}
export function getAIConfig() {
  return loadConfig()
}

export default function AISettings() {
  const [config, setConfig] = useState(loadConfig)
  const [keyInput, setKeyInput] = useState(config.apiKey)
  const [models, setModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => { saveConfig(config) }, [config])

  const provider = PROVIDERS.find(p => p.id === config.provider)!

  const fetchModels = useCallback(async () => {
    if (!config.apiKey) return
    setLoadingModels(true)
    try {
      const resp = await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, provider: config.provider }),
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
    finally { setLoadingModels(false) }
  }, [config.apiKey, config.provider, config.model])

  const saveKey = () => {
    setConfig((c: AIConfig) => ({ ...c, apiKey: keyInput }))
    setTimeout(() => fetchModels(), 100)
  }

  return (
    <div className={styles.settings}>
      <h3 className={styles.title}>⚙️ AI 设置</h3>

      <label className={styles.label}>
        选择厂商
        <select className={styles.select} value={config.provider}
          onChange={e => {
            setConfig((c: AIConfig) => ({ ...c, provider: e.target.value, model: '' }))
            setModels([])
            setKeyInput(config.apiKey)
          }}>
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
        </select>
      </label>

      <label className={styles.label}>
        API Key
        <div className={styles.keyInput}>
          <input className={styles.input} type="password"
            value={keyInput}
            placeholder="粘贴 API Key..."
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveKey() }} />
          <button className={styles.toggleBtn} onClick={saveKey} title="确认">✓</button>
        </div>
        <div className={styles.hint}>{provider.hint}</div>
      </label>

      {models.length > 0 && (
        <label className={styles.label}>
          可用模型 {loadingModels && '(检测中...)'}
          <select className={styles.select} value={config.model}
            onChange={e => setConfig((c: AIConfig) => ({ ...c, model: e.target.value }))}>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
        </label>
      )}

      {!config.apiKey && (
        <div className={styles.hint}>
          💡 API Key 只存你浏览器里，不上传服务器。
        </div>
      )}
    </div>
  )
}
