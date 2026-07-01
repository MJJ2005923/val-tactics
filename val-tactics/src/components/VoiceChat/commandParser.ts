// 指令解析器 — 纯本地，¥0
// 匹配逻辑：剥离唤醒词 → 组合指令优先 → 单一指令 → 兜底

export type VoiceMode = 'coach' | 'listen' | 'speak'
export const LANG_MAP: Record<string, string> = {
  '韩语': 'ko-KR', '日语': 'ja-JP', '英语': 'en-US', '俄语': 'ru-RU',
  '葡萄牙语': 'pt-BR', '西班牙语': 'es-ES', '土耳其语': 'tr-TR',
  '法语': 'fr-FR', '德语': 'de-DE',
}
export const LANG_LABELS: Record<string, string> = {
  'ko-KR': '韩语', 'ja-JP': '日语', 'en-US': '英语', 'ru-RU': '俄语',
  'pt-BR': '葡萄牙语', 'es-ES': '西班牙语', 'tr-TR': '土耳其语',
  'fr-FR': '法语', 'de-DE': '德语',
}
export const CSS_LANG: Record<string, string> = { 'ko-KR': '韩', 'ja-JP': '日', 'en-US': '英', 'ru-RU': '俄', 'pt-BR': '葡', 'es-ES': '西', 'tr-TR': '土', 'fr-FR': '法', 'de-DE': '德' }

const MODE_PATTERNS: [RegExp, VoiceMode][] = [
  [/T教练|战术|问战术|教练模式/, 'coach'],
  [/听队友|翻译模式|翻译.*(?:韩|日|英|俄|葡|西|土|法|德)/, 'listen'],
  [/我说话|聊天|打字|(?:说|打|翻译成)(?:韩|日|英|俄|葡|西|土|法|德)/, 'speak'],
]

const CTRL_PATTERNS: [RegExp, string][] = [
  [/暂停|停止/,'pause'], [/继续|开始/,'resume'], [/清屏/,'clear'],
  [/打开朗读|语音播报/,'tts-on'], [/关闭朗读|关闭语音|安静/,'tts-off'],
  [/关闭|退出/,'close'],
]

const LANG_PATTERNS: [RegExp, string][] = [
  [/韩语|韩文|한/, 'ko-KR'], [/日语|日文|に/, 'ja-JP'], [/英语|英文/, 'en-US'],
  [/俄语|俄文/, 'ru-RU'], [/葡萄牙|葡语/, 'pt-BR'], [/西班牙|西语/, 'es-ES'],
  [/土耳其|土语/, 'tr-TR'], [/法语|法文/, 'fr-FR'], [/德语|德文/, 'de-DE'],
]

export interface ParseResult {
  /** null=未识别指令，进入兜底 */
  cmd: 'mode' | 'ctrl' | 'lang' | 'combo' | 'ask' | 'need-more' | null
  mode?: VoiceMode
  ctrl?: string
  langKey?: string   // e.g. 'ko-KR'
  text?: string      // 剥离唤醒词后的内容
  feedback?: string  // 兜底反馈
}

export function parse(input: string, wakeWord: string, currentMode: VoiceMode): ParseResult {
  let text = input.trim()
  if (!text) return { cmd: null }

  // 1. 剥离唤醒词
  if (wakeWord && text.startsWith(wakeWord)) {
    text = text.slice(wakeWord.length).trim()
  }

  // 空内容 → 兜底
  if (!text) return {
    cmd: 'need-more',
    feedback: `我在听。你可以说"问战术"来切换T教练模式，或者说"翻译成韩语"来启用翻译。`,
  }

  // 2. 组合指令：翻译成X语 → 切换 speak 模式 + 设置语言
  const comboMatch = text.match(/翻译成(韩|日|英|俄|葡|西|土|法|德)语/)
  if (comboMatch) {
    for (const [pat, key] of LANG_PATTERNS) {
      if (pat.test(comboMatch[0])) {
        return { cmd: 'combo', mode: 'speak', langKey: key }
      }
    }
  }

  // 3. 单一指令
  for (const [pat, mode] of MODE_PATTERNS) {
    if (pat.test(text)) {
      return { cmd: 'mode', mode }
    }
  }
  for (const [pat, ctrl] of CTRL_PATTERNS) {
    if (pat.test(text)) return { cmd: 'ctrl', ctrl }
  }
  for (const [pat, key] of LANG_PATTERNS) {
    if (pat.test(text)) return { cmd: 'lang', langKey: key }
  }

  // 4. 未命中 → 按当前模式路由问题
  return { cmd: 'ask', text, mode: currentMode }
}
