import { useState, useCallback } from 'react'

export interface VoiceSettings {
  ttsMode: 'click' | 'auto' | 'off'
  confirmMode: 'brief' | 'full'
  selectedVoice: string
}

const DEFAULTS: VoiceSettings = {
  ttsMode: (localStorage.getItem('val-tactics-voice-tts-mode') as VoiceSettings['ttsMode']) || 'click',
  confirmMode: (localStorage.getItem('val-tactics-voice-confirm') as VoiceSettings['confirmMode']) || 'brief',
  selectedVoice: localStorage.getItem('val-tactics-voice-name') || '',
}

export function useSpeechSynthesis() {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULTS)

  const getVoice = useCallback((name?: string) => {
    const voices = speechSynthesis.getVoices()
    const targetName = name || settings.selectedVoice
    if (targetName) {
      const found = voices.find(v => v.name === targetName)
      if (found) return found
    }
    // 回退：优先找中文女声
    return voices.find(v => v.lang.startsWith('zh') && v.name.includes('Hui')) ||
           voices.find(v => v.lang.startsWith('zh')) ||
           voices[0]
  }, [settings.selectedVoice])

  const speak = useCallback((text: string, auto = false) => {
    if (settings.ttsMode === 'off') return
    if (settings.ttsMode === 'click' && !auto) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.slice(0, 200))
    u.lang = 'zh-CN'
    u.rate = 1.1
    const voice = getVoice()
    if (voice) u.voice = voice
    speechSynthesis.speak(u)
  }, [settings.ttsMode, getVoice])

  const beep = useCallback((hz = 880, duration = 0.12) => {
    try {
      const ctx = new AudioContext()
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = hz; o.type = 'sine'; g.gain.value = 0.08
      o.start(); o.stop(ctx.currentTime + duration)
      setTimeout(() => ctx.close(), 200)
    } catch {}
  }, [])

  const confirmAction = useCallback((text: string) => {
    if (settings.confirmMode === 'full') speak(text, true)
    else beep()
  }, [settings.confirmMode, speak, beep])

  const updateSetting = useCallback(<K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(`val-tactics-voice-${key === 'ttsMode' ? 'tts-mode' : key === 'confirmMode' ? 'confirm' : key === 'selectedVoice' ? 'name' : key}`, String(value))
      return next
    })
  }, [])

  const listVoices = useCallback(() => {
    return speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'))
  }, [])

  return { settings, speak, beep, confirmAction, updateSetting, listVoices, getVoice }
}
