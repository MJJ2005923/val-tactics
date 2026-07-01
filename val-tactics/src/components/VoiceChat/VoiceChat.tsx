import { useState, useRef, useEffect, useCallback } from 'react'
import { useSpeechRecognition, type VoiceResult } from './useSpeechRecognition'
import { parse, type VoiceMode, LANG_MAP, LANG_LABELS, CSS_LANG } from './commandParser'
import { decryptKey } from '../../utils/crypto'
import styles from './VoiceChat.module.css'

type Message = {
  id: number
  type: 'coach-q' | 'coach-a' | 'listen' | 'speak'
  text: string
  translated?: string
  langKey?: string
  copied?: boolean
}

const QUICK_PHRASES = ['来支援', 'A点有敌', 'B点空的', '撤退', '进攻', '等一下', '下包', '拆包']

export default function VoiceChat({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<VoiceMode>('coach')
  const [messages, setMessages] = useState<Message[]>([])
  const [mid, setMid] = useState(0)
  const [pendingText, setPendingText] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 设置
  const [wakeWord, setWakeWord] = useState(() => localStorage.getItem('val-tactics-voice-wake') || 'T教练')
  const [confirmMode, setConfirmMode] = useState(() => localStorage.getItem('val-tactics-voice-confirm') || 'brief')
  const [ttsOn, setTtsOn] = useState(() => localStorage.getItem('val-tactics-voice-tts') === '1')
  const [autoMin, setAutoMin] = useState(() => localStorage.getItem('val-tactics-voice-automin') || 'never')
  const [transLang, setTransLang] = useState(() => localStorage.getItem('val-tactics-voice-translang') || 'ko-KR')
  const uid = () => { let id = localStorage.getItem('val-tactics-uid'); if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }; return id }
  const getConfig = () => { try { const cfg = JSON.parse(localStorage.getItem('val-tactics-ai-config') || '{}'); if (cfg.apiKey) cfg.apiKey = decryptKey(cfg.apiKey, uid()); return cfg } catch { return {} } }
  const [apiKey, setApiKey] = useState(() => (getConfig().apiKey || ''))
  const [showKey, setShowKey] = useState(false)
  const hasApiKey = !!(getConfig().apiKey)

  const scrollRef = useRef<HTMLDivElement>(null)
  const msgRef = useRef(messages)
  msgRef.current = messages

  const addMsg = useCallback((m: Omit<Message, 'id'>) => {
    setMid(p => p + 1)
    setMessages(prev => [...prev.slice(-80), { ...m, id: mid + 1 }])
  }, [mid])

  const speakTTS = useCallback((text: string) => {
    if (!ttsOn || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text.slice(0,100))
    u.lang = 'zh-CN'; u.rate = 1.1
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }, [ttsOn])

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880; o.type = 'sine'
      g.gain.value = 0.08
      o.start(); o.stop(ctx.currentTime + 0.12)
      setTimeout(() => ctx.close(), 200)
    } catch {}
  }, [])

  const confirmAction = useCallback((text: string) => {
    if (confirmMode === 'full') speakTTS(text)
    else playBeep()
  }, [confirmMode, speakTTS, playBeep])

  // 发送到 T教练 / 翻译
  const callAI = useCallback(async (prompt: string, target: 'coach' | 'translate' | 'speak', langKey?: string) => {
    const config = (() => { try { return JSON.parse(localStorage.getItem('val-tactics-ai-config') || '{}') } catch { return {} } })()
    const model = config.model || 'deepseek-v4-flash'
    const apiKey = config.apiKey || ''

    let systemPrompt: string
    if (target === 'coach') {
      systemPrompt = '你是T教练——无畏契约战术教练。用中文简洁回答用户的问题，控制在3句话以内。'
    } else if (target === 'speak' && langKey) {
      systemPrompt = `将以下中文翻译成${LANG_LABELS[langKey] || langKey}。只输出翻译结果，不要解释。`
    } else {
      systemPrompt = `将以下文本翻译成中文。只输出翻译结果，不要解释。`
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

  // 处理最终结果
  const handleFinal = useCallback(async (result: VoiceResult) => {
    const parsed = parse(result.text, wakeWord, mode)
    if (!parsed.cmd) return

    switch (parsed.cmd) {
      case 'mode': {
        if (parsed.mode && parsed.mode !== mode) {
          setMode(parsed.mode)
          confirmAction(`已切换到${parsed.mode === 'coach' ? 'T教练' : parsed.mode === 'listen' ? '听队友' : '我说话'}模式`)
        }
        return
      }
      case 'ctrl': {
        if (parsed.ctrl === 'pause') useSpeechRecognition.prototype?.stop?.()
        else if (parsed.ctrl === 'clear') setMessages([])
        else if (parsed.ctrl === 'tts-on') { setTtsOn(true); localStorage.setItem('val-tactics-voice-tts', '1') }
        else if (parsed.ctrl === 'tts-off') { setTtsOn(false); localStorage.setItem('val-tactics-voice-tts', '0') }
        else if (parsed.ctrl === 'close') onClose()
        return
      }
      case 'lang': {
        if (parsed.langKey) { setTransLang(parsed.langKey); localStorage.setItem('val-tactics-voice-translang', parsed.langKey); confirmAction(`翻译语言已切换为${LANG_LABELS[parsed.langKey]}`) }
        return
      }
      case 'combo': {
        if (parsed.mode) setMode(parsed.mode)
        if (parsed.langKey) { setTransLang(parsed.langKey); localStorage.setItem('val-tactics-voice-translang', parsed.langKey) }
        confirmAction(`已切换到说话模式，目标语言${LANG_LABELS[parsed.langKey || 'ko-KR']}`)
        return
      }
      case 'need-more': {
        if (parsed.feedback) speakTTS(parsed.feedback)
        return
      }
      case 'ask': {
        const txt = parsed.text || result.text
        if (!txt) return
        if (mode === 'coach') {
          addMsg({ type: 'coach-q', text: txt })
          setPendingText('T教练思考中...')
          const answer = await callAI(txt, 'coach')
          setPendingText('')
          if (answer) {
            addMsg({ type: 'coach-a', text: answer })
            speakTTS(answer)
          }
        } else if (mode === 'listen') {
          const answer = await callAI(txt, 'translate')
          if (answer) addMsg({ type: 'listen', text: txt, translated: answer, langKey: parsed.langKey })
        } else if (mode === 'speak') {
          const answer = await callAI(txt, 'speak', transLang)
          if (answer) addMsg({ type: 'speak', text: answer, translated: txt, langKey: transLang })
        }
        return
      }
    }
  }, [mode, wakeWord, confirmAction, addMsg, callAI, speakTTS, transLang, onClose])

  const { listening, error, start, stop, setLang } = useSpeechRecognition({
    lang: mode === 'coach' ? 'zh-CN' : transLang,
    onResult: (r) => { if (r.confidence > 0.3) setPendingText(r.text) },
    onFinal: handleFinal,
  })

  // 自动最小化
  useEffect(() => {
    if (autoMin === 'never' || !listening) return
    const t = setTimeout(() => setMinimized(true), autoMin === '5s' ? 5000 : 10000)
    return () => clearTimeout(t)
  }, [listening, autoMin])

  const saveWake = (v: string) => { setWakeWord(v); localStorage.setItem('val-tactics-voice-wake', v) }
  const saveConfirm = (v: string) => { setConfirmMode(v); localStorage.setItem('val-tactics-voice-confirm', v) }
  const saveAutoMin = (v: string) => { setAutoMin(v); localStorage.setItem('val-tactics-voice-automin', v) }

  if (minimized) return (
    <div className={styles.ball} onClick={() => setMinimized(false)} title="展开语音助手">
      {listening ? '🎤' : '⏸'}
      <span className={styles.ballDot} style={{ background: listening ? '#05F8F8' : '#ff5555' }} />
    </div>
  )

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>🎤 T教练语音助手</span>
        <div className={styles.headerBtns}>
          <button className={styles.iconBtn} onClick={() => setShowSettings(!showSettings)} title="设置">⚙</button>
          <button className={styles.iconBtn} onClick={() => setMinimized(true)} title="最小化">—</button>
          <button className={styles.iconBtn} onClick={onClose} title="关闭">✕</button>
        </div>
      </div>

      {/* 状态栏 */}
      <div className={styles.status}>
        <span className={styles.statusDot} style={{ background: listening ? '#05F8F8' : '#ff5555' }} />
        <span>{listening ? `正在听... (唤醒词: ${wakeWord})` : '已暂停'}</span>
        <button className={styles.pauseBtn} onClick={() => listening ? stop() : start()}>
          {listening ? '暂停' : '开始'}
        </button>
      </div>

      {/* 模式 Tab */}
      <div className={styles.tabs}>
        {[
          { id: 'coach' as const, icon: '🎓', label: 'T教练' },
          { id: 'listen' as const, icon: '👂', label: '听队友' },
          { id: 'speak' as const, icon: '🗣️', label: '我说话' },
        ].map(t => (
          <button key={t.id} className={`${styles.tab} ${mode === t.id ? styles.tabActive : ''}`}
            onClick={() => { setMode(t.id); confirmAction(`已切换到${t.label}模式`) }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 语言选择（listen/speak 模式） */}
      {mode !== 'coach' && (
        <div className={styles.langRow}>
          <span className={styles.langLabel}>翻译语言：</span>
          <select className={styles.langSelect} value={transLang} onChange={e => {
            setTransLang(e.target.value); localStorage.setItem('val-tactics-voice-translang', e.target.value)
            setLang(e.target.value)
          }}>
            {Object.entries(LANG_MAP).map(([label, key]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {mode === 'speak' && <span className={styles.hint}>（中文→{LANG_LABELS[transLang]}）</span>}
          {mode === 'listen' && <span className={styles.hint}>（{LANG_LABELS[transLang]}→中文）</span>}
        </div>
      )}

      {/* API Key 未设置提示 */}
      {!hasApiKey && (
        <div className={styles.apiNotice}>
          ⚠️ 未设置 API Key。语音对话需要消耗 AI 调用，请先在 <b>T教练 → 自备 API</b> 中输入你的 DeepSeek API Key。
        </div>
      )}

      {/* 消息流 */}
      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 && !pendingText && (
          <div className={styles.emptyHint}>
            {mode === 'coach' ? '直接说话问战术，或者说"T教练"唤醒我' :
             mode === 'listen' ? '开着麦克风，队友语音会自动翻译成中文' :
             '说中文，我帮你翻译成外语发给队友'}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`${styles.bubble} ${styles['bubble_' + m.type]}`}>
            {m.type === 'coach-q' && <span className={styles.tag}>🎓 你</span>}
            {m.type === 'coach-a' && <span className={styles.tag}>🎓 T教练</span>}
            {m.type === 'listen' && <span className={styles.tag}>👂 {CSS_LANG[m.langKey || 'ko-KR']}→中</span>}
            {m.type === 'speak' && <span className={styles.tag}>🗣️ 中→{CSS_LANG[m.langKey || 'ko-KR']}</span>}
            <div className={styles.msgText}>{m.text}</div>
            {m.translated && <div className={styles.msgTrans}>{m.translated}</div>}
            {m.type === 'speak' && (
              <button className={styles.copyBtn} onClick={() => {
                navigator.clipboard.writeText(m.text).then(() => {
                  setMessages(prev => prev.map(x => x.id === m.id ? { ...x, copied: true } : x))
                  setTimeout(() => setMessages(prev => prev.map(x => x.id === m.id ? { ...x, copied: false } : x)), 2000)
                })
              }}>{m.copied ? '✅ 已复制' : '📋 复制'}</button>
            )}
          </div>
        ))}
        {pendingText && <div className={styles.pending}>{pendingText}</div>}
      </div>

      {/* 快捷短语（speak模式） */}
      {mode === 'speak' && (
        <div className={styles.quickPhrases}>
          {QUICK_PHRASES.map(p => (
            <button key={p} className={styles.quickBtn} onClick={async () => {
              const answer = await callAI(p, 'speak', transLang)
              if (answer) addMsg({ type: 'speak', text: answer, translated: p, langKey: transLang })
            }}>{p}</button>
          ))}
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className={styles.settings}>
          <div className={styles.setRow}>
            <label>唤醒词</label>
            <input value={wakeWord} onChange={e => saveWake(e.target.value)} maxLength={8} />
          </div>
          <div className={styles.setRow}>
            <label>确认语</label>
            <select value={confirmMode} onChange={e => saveConfirm(e.target.value)}>
              <option value="brief">简洁（音效）</option>
              <option value="full">详细（语音）</option>
            </select>
          </div>
          <div className={styles.setRow}>
            <label>TTS 语音播报</label>
            <button className={ttsOn ? styles.toggleOn : styles.toggleOff} onClick={() => {
              setTtsOn(!ttsOn); localStorage.setItem('val-tactics-voice-tts', ttsOn ? '0' : '1')
            }}>{ttsOn ? '开' : '关'}</button>
          </div>
          <div className={styles.setRow}>
            <label>自动最小化</label>
            <select value={autoMin} onChange={e => saveAutoMin(e.target.value)}>
              <option value="never">永不</option>
              <option value="5s">5秒</option>
              <option value="10s">10秒</option>
            </select>
          </div>
          <div className={styles.setRow}>
            <label>API Key</label>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                placeholder="sk-..."
                onChange={e => setApiKey(e.target.value)}
                onBlur={() => {
                  const cfg = getConfig()
                  cfg.apiKey = apiKey
                  localStorage.setItem('val-tactics-ai-config', JSON.stringify(cfg))
                }}
                style={{ width: 160, textAlign: 'left' }}
              />
              <button className={styles.iconBtn} onClick={() => setShowKey(!showKey)}
                style={{ fontSize: 10 }} title={showKey ? '隐藏' : '显示'}>
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button className={styles.clearBtn} onClick={() => setMessages([])}>清屏</button>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}
    </div>
  )
}
