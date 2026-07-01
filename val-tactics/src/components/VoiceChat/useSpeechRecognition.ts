import { useState, useRef, useCallback, useEffect } from 'react'

// 浏览器 SpeechRecognition 类型声明
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export type VoiceResult = { text: string; timestamp: number; confidence: number }

interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (r: VoiceResult) => void
  onFinal?: (r: VoiceResult) => void
}

export function useSpeechRecognition(opts: UseSpeechRecognitionOptions = {}) {
  const { lang = 'auto', continuous = true, interimResults = true, onResult, onFinal } = opts
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLang, setCurrentLang] = useState(lang)
  const recognitionRef = useRef<any>(null)
  const restartRef = useRef(false)
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTextRef = useRef('')
  // 用 ref 持有最新回调，避免自动重连时闭包过期
  const onResultRef = useRef(onResult)
  const onFinalRef = useRef(onFinal)
  onResultRef.current = onResult
  onFinalRef.current = onFinal

  // 停顿 2 秒没新结果 → 当作说完
  const resetSilence = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current)
    silenceRef.current = setTimeout(() => {
      if (lastTextRef.current) {
        const r: VoiceResult = { text: lastTextRef.current, timestamp: Date.now(), confidence: 0.5 }
        console.debug('[Voice] silence trigger → final:', r.text.slice(0, 60))
        onFinalRef.current?.(r)
        lastTextRef.current = ''
      }
    }, 2500)
  }, [])

  useEffect(() => () => { if (silenceRef.current) clearTimeout(silenceRef.current) }, [])

  const start = useCallback((langOverride?: string) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('浏览器不支持语音识别，请使用 Chrome')
      return
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      const rec = new SpeechRecognition()
      rec.lang = langOverride || currentLang || 'zh-CN'
      rec.continuous = continuous
      rec.interimResults = interimResults
      rec.maxAlternatives = 1

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]
          const result: VoiceResult = {
            text: r[0].transcript.trim(),
            timestamp: Date.now(),
            confidence: r[0].confidence || 0,
          }
          onResultRef.current?.(result)
          lastTextRef.current = result.text
          if (r.isFinal) {
            if (silenceRef.current) clearTimeout(silenceRef.current)
            console.debug('[Voice] STT final:', result.text.slice(0, 60))
            onFinalRef.current?.(result)
            lastTextRef.current = ''
          } else {
            resetSilence()
          }
        }
      }

      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError('麦克风权限被拒绝')
          setListening(false)
          restartRef.current = false
        }
        // aborted / no-speech / network 等错误静默处理，onend 会自动重启
      }

      rec.onend = () => {
        if (restartRef.current) {
          setTimeout(() => { try { rec.start() } catch {} }, 200)
        } else {
          setListening(false)
        }
      }

      rec.start()
      recognitionRef.current = rec
      restartRef.current = true
      setListening(true)
      setError(null)
    } catch (e: any) {
      setError(e.message || '语音识别启动失败')
    }
  }, [currentLang, continuous, interimResults, onResult, onFinal])

  const stop = useCallback(() => {
    restartRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const setLang = useCallback((l: string) => {
    setCurrentLang(l)
    if (recognitionRef.current) {
      recognitionRef.current.lang = l
    }
    // 重启以应用新语言
    if (listening) {
      stop()
      setTimeout(() => start(l), 100)
    }
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      restartRef.current = false
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [])

  return { listening, error, start, stop, setLang, currentLang }
}
