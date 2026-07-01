import { useState, useRef, useEffect, useCallback } from 'react'
import { useSpeechRecognition, type VoiceResult } from './useSpeechRecognition'
import { useSpeechSynthesis } from './useSpeechSynthesis'
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

const QUICK_PHRASES = ['来支援', 'A点有敌', 'B点空的', '撤退', '进攻', '等一下', '下包', '拆包', '买枪', 'ECO局', 'Nice', '抱歉']

export default function VoiceChat({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<VoiceMode>('coach')
  const [messages, setMessages] = useState<Message[]>([])
  const [mid, setMid] = useState(0)
  const [pendingText, setPendingText] = useState('')
  const [minimized, setMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // 设置
  const [wakeWord, setWakeWord] = useState(() => localStorage.getItem('val-tactics-voice-wake') || 'T教练')
  const [autoMin, setAutoMin] = useState(() => localStorage.getItem('val-tactics-voice-automin') || 'never')
  const [transLang, setTransLang] = useState(() => localStorage.getItem('val-tactics-voice-translang') || 'ko-KR')
  const tts = useSpeechSynthesis()
  const uid = () => { let id = localStorage.getItem('val-tactics-uid'); if (!id) { id = 'u' + Date.now().toString(36); localStorage.setItem('val-tactics-uid', id) }; return id }
  const getConfig = () => { try { const cfg = JSON.parse(localStorage.getItem('val-tactics-ai-config') || '{}'); if (cfg.apiKey) cfg.apiKey = decryptKey(cfg.apiKey, uid()); return cfg } catch { return {} } }
  const [apiKey, setApiKey] = useState(() => (getConfig().apiKey || ''))
  const [showKey, setShowKey] = useState(false)
  const hasApiKey = !!(getConfig().apiKey)

  const scrollRef = useRef<HTMLDivElement>(null)
  // 用 ref 持有最新状态，避免自动重连时闭包过期
  const modeRef = useRef(mode)
  const wakeWordRef = useRef(wakeWord)
  const transLangRef = useRef(transLang)
  modeRef.current = mode
  wakeWordRef.current = wakeWord
  transLangRef.current = transLang

  const addMsg = useCallback((m: Omit<Message, 'id'>) => {
    setMid(p => p + 1)
    setMessages(prev => [...prev.slice(-80), { ...m, id: mid + 1 }])
  }, [mid])

  const speakTTS = useCallback((text: string) => tts.speak(text, true), [tts])
  const confirmAction = useCallback((text: string) => tts.confirmAction(text), [tts])

  // 发送到 T教练 / 翻译
  const callAI = useCallback(async (prompt: string, target: 'coach' | 'translate' | 'speak', langKey?: string) => {
    const config = getConfig()
    const model = config.model || 'deepseek-v4-flash'
    const apiKey = config.apiKey || ''

    let systemPrompt: string
    if (target === 'coach') {
      systemPrompt = '你是T教练——无畏契约战术教练。用中文简洁回答用户的问题，控制在3句话以内。'
    } else if (target === 'speak' && langKey) {
      systemPrompt = `将以下中文翻译成${LANG_LABELS[langKey] || langKey}。只输出翻译结果，不要解释。`
    } else {
      const srcLabel = LANG_LABELS[transLang] || ''
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
  }, [transLang])

  // 处理最终结果
  const handleFinal = useCallback(async (result: VoiceResult) => {
    const parsed = parse(result.text, wakeWordRef.current, modeRef.current)
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
        if (parsed.ctrl === 'pause') stop()
        else if (parsed.ctrl === 'resume') start()
        else if (parsed.ctrl === 'clear') setMessages([])
        else if (parsed.ctrl === 'tts-on') tts.updateSetting('ttsMode', 'auto')
        else if (parsed.ctrl === 'tts-off') tts.updateSetting('ttsMode', 'off')
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
        const currentMode = modeRef.current
        const currentTransLang = transLangRef.current
        if (currentMode === 'coach') {
          addMsg({ type: 'coach-q', text: txt })
          setPendingText('T教练思考中...')
          const answer = await callAI(txt, 'coach')
          setPendingText('')
          if (answer) {
            addMsg({ type: 'coach-a', text: answer })
            speakTTS(answer)
          }
        } else if (currentMode === 'listen') {
          const answer = await callAI(txt, 'translate')
          if (answer) addMsg({ type: 'listen', text: txt, translated: answer, langKey: parsed.langKey || currentTransLang })
        } else if (currentMode === 'speak') {
          const answer = await callAI(txt, 'speak', currentTransLang)
          if (answer) {
            addMsg({ type: 'speak', text: answer, translated: txt, langKey: currentTransLang })
            navigator.clipboard.writeText(answer).catch(() => {})
          }
        }
        return
      }
    }
  }, [mode, wakeWord, confirmAction, addMsg, callAI, speakTTS, transLang, onClose])

  const { listening, error, start, stop, setLang } = useSpeechRecognition({
    lang: mode === 'listen' ? transLang : 'zh-CN',
    onResult: (r) => { setPendingText(r.text) },
    onFinal: handleFinal,
  })

  // 自动最小化
  useEffect(() => {
    if (autoMin === 'never' || !listening) return
    const t = setTimeout(() => setMinimized(true), autoMin === '5s' ? 5000 : 10000)
    return () => clearTimeout(t)
  }, [listening, autoMin])

  const saveWake = (v: string) => { setWakeWord(v); localStorage.setItem('val-tactics-voice-wake', v) }
  const saveAutoMin = (v: string) => { setAutoMin(v); localStorage.setItem('val-tactics-voice-automin', v) }

  // 打开独立 PiP 窗口
  const openPiP = useCallback(async () => {
    const pipUrl = `${window.location.origin}${window.location.pathname}?pip=1`
    try {
      // @ts-ignore — Chrome 116+ Document Picture-in-Picture API
      if (window.documentPictureInPicture) {
        // @ts-ignore
        const pipWindow = await documentPictureInPicture.requestWindow({ width: 340, height: 200 })
        pipWindow.location.href = pipUrl
      } else {
        window.open(pipUrl, 'voice-pip', 'width=340,height=200')
      }
    } catch {
      window.open(pipUrl, 'voice-pip', 'width=340,height=200')
    }
  }, [])

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
          <button className={styles.iconBtn} onClick={openPiP} title="独立窗口">📌</button>
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
            <select value={tts.settings.confirmMode} onChange={e => tts.updateSetting('confirmMode', e.target.value as 'brief'|'full')}>
              <option value="brief">简洁（音效）</option>
              <option value="full">详细（语音）</option>
            </select>
          </div>
          <div className={styles.setRow}>
            <label>朗读模式</label>
            <select value={tts.settings.ttsMode} onChange={e => tts.updateSetting('ttsMode', e.target.value as 'click'|'auto'|'off')}>
              <option value="click">🔘 点击朗读</option>
              <option value="auto">🤖 自动朗读</option>
              <option value="off">🔇 关闭</option>
            </select>
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
