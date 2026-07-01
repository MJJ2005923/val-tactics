import { useState, useRef, useEffect, useCallback } from 'react'
import { useSpeechRecognition, type VoiceResult } from './useSpeechRecognition'
import { parse, type VoiceMode, LANG_LABELS, CSS_LANG } from './commandParser'
import { decryptKey } from '../../utils/crypto'
import styles from './VoiceChatPiP.module.css'

type PiPMessage = {
  id: number
  type: 'coach-q' | 'coach-a' | 'listen' | 'speak'
  text: string
  translated?: string
  langKey?: string
}

export default function VoiceChatPiP() {
  const [mode, setMode] = useState<VoiceMode>(() =>
    (localStorage.getItem('val-tactics-voice-pip-mode') as VoiceMode) || 'coach')
  const [messages, setMessages] = useState<PiPMessage[]>([])
  const [mid, setMid] = useState(0)
  const [pinned, setPinned] = useState(() =>
    localStorage.getItem('val-tactics-voice-pip-pinned') === 'true')
  const [listening, setListening] = useState(false)
  const [copyHint, setCopyHint] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const transLang = useRef(localStorage.getItem('val-tactics-voice-translang') || 'ko-KR')
  const wakeWord = useRef(localStorage.getItem('val-tactics-voice-wake') || 'T教练')
  const modeRef = useRef(mode)
  modeRef.current = mode
  const stopRef = useRef<() => void>(() => {})
  const startRef = useRef<() => void>(() => {})

  // localStorage 配置同步
  useEffect(() => {
    const onStorage = () => {
      transLang.current = localStorage.getItem('val-tactics-voice-translang') || 'ko-KR'
      wakeWord.current = localStorage.getItem('val-tactics-voice-wake') || 'T教练'
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 持久化
  useEffect(() => { localStorage.setItem('val-tactics-voice-pip-mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('val-tactics-voice-pip-pinned', String(pinned)) }, [pinned])

  // 自动滚动
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' })
  }, [messages])

  const uid = () => { let id = localStorage.getItem('val-tactics-uid'); if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }; return id }
  const getConfig = () => { try { const cfg = JSON.parse(localStorage.getItem('val-tactics-ai-config') || '{}'); if (cfg.apiKey) cfg.apiKey = decryptKey(cfg.apiKey, uid()); return cfg } catch { return {} } }

  const addMsg = useCallback((m: Omit<PiPMessage, 'id'>) => {
    setMid(p => p + 1)
    setMessages(prev => [...prev.slice(-20), { ...m, id: mid + 1 }])
    try { localStorage.setItem('val-tactics-voice-pip-msg', JSON.stringify({ ...m, id: mid + 1 })) } catch {}
  }, [mid])

  const callAI = useCallback(async (prompt: string, target: 'coach' | 'translate' | 'speak', langKey?: string) => {
    const config = getConfig()
    const model = config.model || 'deepseek-v4-flash'
    const apiKey = config.apiKey || ''
    const tl = transLang.current

    let systemPrompt: string
    if (target === 'coach') {
      systemPrompt = '你是T教练——无畏契约战术教练。用中文简洁回答用户的问题，控制在2句话以内。'
    } else if (target === 'speak' && langKey) {
      systemPrompt = `将以下中文翻译成${LANG_LABELS[langKey] || langKey}。只输出翻译结果，不要解释。`
    } else {
      const srcLabel = LANG_LABELS[tl] || ''
      systemPrompt = `将以下${srcLabel}文本翻译成中文。只输出翻译结果，不要解释。`
    }

    try {
      const resp = await fetch('/api/ai', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          apiKey, provider: 'deepseek', model,
          messages: [{ role: 'user', content: systemPrompt }, { role: 'user', content: prompt }],
        }),
      })
      const data = await resp.json()
      const content = data.content?.[0]?.text || data.choices?.[0]?.message?.content || ''
      return content.trim()
    } catch {
      return null
    }
  }, [])

  const handleFinal = useCallback(async (result: VoiceResult) => {
    const currentMode = modeRef.current
    const tl = transLang.current
    const parsed = parse(result.text, wakeWord.current, currentMode)
    if (!parsed.cmd) return

    if (parsed.cmd === 'ctrl') {
      if (parsed.ctrl === 'pause') { stopRef.current(); setListening(false); setError(null); return }
      if (parsed.ctrl === 'resume') { startRef.current(); setListening(true); return }
      if (parsed.ctrl === 'clear') { setMessages([]); return }
      if (parsed.ctrl === 'close') { window.close(); return }
    }

    switch (parsed.cmd) {
      case 'mode': {
        if (parsed.mode && parsed.mode !== currentMode) setMode(parsed.mode)
        return
      }
      case 'lang': {
        if (parsed.langKey) {
          localStorage.setItem('val-tactics-voice-translang', parsed.langKey)
          transLang.current = parsed.langKey
        }
        return
      }
      case 'combo': {
        if (parsed.mode) setMode(parsed.mode)
        if (parsed.langKey) {
          localStorage.setItem('val-tactics-voice-translang', parsed.langKey)
          transLang.current = parsed.langKey
        }
        return
      }
      case 'need-more': return
      case 'ask': {
        const txt = parsed.text || result.text
        if (!txt) return
        if (currentMode === 'coach') {
          addMsg({ type: 'coach-q', text: txt })
          const answer = await callAI(txt, 'coach')
          if (answer) addMsg({ type: 'coach-a', text: answer })
        } else if (currentMode === 'listen') {
          const answer = await callAI(txt, 'translate')
          if (answer) addMsg({ type: 'listen', text: txt, translated: answer, langKey: parsed.langKey || tl })
        } else if (currentMode === 'speak') {
          const answer = await callAI(txt, 'speak', tl)
          if (answer) {
            addMsg({ type: 'speak', text: answer, translated: txt, langKey: tl })
            navigator.clipboard.writeText(answer).then(() => {
              setCopyHint(true)
              setTimeout(() => setCopyHint(false), 2000)
            }).catch(() => {})
          }
        }
        return
      }
    }
  }, [addMsg, callAI])

  const { start, stop, error: srError } = useSpeechRecognition({
    lang: mode === 'listen' ? transLang.current : 'zh-CN',
    onFinal: handleFinal,
  })

  useEffect(() => { stopRef.current = stop; startRef.current = start }, [stop, start])
  useEffect(() => { if (srError) setError(srError) }, [srError])

  // 仅首次自动启动录音
  useEffect(() => {
    if (!initialized) {
      start()
      setListening(true)
      setInitialized(true)
    }
  }, [start, initialized])

  const statusColor = listening ? '#05F8F8' : '#ff5555'
  const modeEmoji = mode === 'coach' ? '🎓' : mode === 'listen' ? '👂' : '🗣️'
  const tl = transLang.current

  return (
    <div className={`${styles.pipShell} ${pinned ? styles.pipShellFixed : ''}`}>
      {/* 拖拽句柄 */}
      <div className={styles.dragHandle}>
        <button className={styles.dragHandleBtn}
          onClick={() => setPinned(!pinned)}
          title={pinned ? '解除固定' : '固定穿透'}>
          {pinned ? '📌' : '🖐'}
        </button>
        <button className={styles.dragHandleBtn}
          onClick={() => window.close()}
          title="关闭">✕</button>
      </div>

      {/* 状态行 */}
      <div className={styles.statusBar}>
        <span className={styles.statusDot} style={{ background: statusColor, color: statusColor }} />
        <span className={styles.statusMode}>{modeEmoji}</span>
        {mode !== 'coach' && (
          <span className={styles.statusLabel}>
            {CSS_LANG[tl] || '韩'}
          </span>
        )}
      </div>

      {/* 消息区 */}
      <div className={styles.msgArea} ref={scrollRef}>
        {messages.length === 0 && !copyHint && (
          <div className={styles.emptyHint}>
            {mode === 'coach' ? '直接说话问战术' :
             mode === 'listen' ? `正在听${LANG_LABELS[tl] || ''}...` :
             '说中文 → 翻译'}
          </div>
        )}
        {messages.map(m => {
          const cls = m.type === 'coach-q' ? styles.msgCoachQ :
                      m.type === 'coach-a' ? styles.msgCoachA :
                      m.type === 'listen' ? styles.msgListen : styles.msgSpeak
          const tag = m.type === 'coach-q' ? '🎓 你' :
                      m.type === 'coach-a' ? '🎓 T教练' :
                      m.type === 'listen' ? `👂 ${CSS_LANG[m.langKey || 'ko-KR']}→中` :
                      `🗣️ 中→${CSS_LANG[m.langKey || 'ko-KR']}`
          return (
            <div key={m.id} className={`${styles.msgRow} ${cls}`}>
              <div className={styles.msgTag}>{tag}</div>
              <div className={styles.msgText}>{m.text}</div>
              {m.translated && <div className={styles.msgTrans}>{m.translated}</div>}
            </div>
          )
        })}
      </div>

      {/* 底部栏 */}
      <div className={styles.bottomBar}>
        {copyHint && <span className={styles.copyHint}>📋 已复制到剪贴板</span>}
        {error && <span className={styles.pipError}>{error}</span>}
      </div>
    </div>
  )
}