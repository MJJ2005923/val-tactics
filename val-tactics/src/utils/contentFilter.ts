/**
 * 内容安全过滤器
 * 第一层：敏感词库快速匹配（同步，零延迟）
 * 第二层：AI 深度审核（异步，处理模糊边界）
 */

import { checkWords, checkSpam } from '../data/sensitiveWords'

export interface FilterResult {
  /** 是否允许发布 */
  allowed: boolean
  /** 审核级别：pass=通过 block=拦截 review=需人工审 */
  level: 'pass' | 'block' | 'review'
  /** 原因描述 */
  reason: string
  /** 命中的违规类型 */
  flags: string[]
}

/**
 * 第一层：词库快速检查（客户端可用，零延迟）
 */
export function quickFilter(text: string): FilterResult {
  if (!text || text.trim().length === 0) {
    return { allowed: false, level: 'block', reason: '内容为空', flags: ['empty'] }
  }

  // 敏感词检查
  const wordResult = checkWords(text)
  if (wordResult.blocked) {
    return {
      allowed: false,
      level: 'block',
      reason: `包含违规内容：${wordResult.words.length} 个敏感词`,
      flags: ['sensitive_words'],
    }
  }

  // 垃圾广告检查
  const spamResult = checkSpam(text)
  if (spamResult.isSpam) {
    return {
      allowed: false,
      level: 'review',
      reason: '疑似垃圾广告，需人工审核',
      flags: ['spam'],
    }
  }

  return { allowed: true, level: 'pass', reason: '', flags: [] }
}

/**
 * 第二层：AI 深度审核（异步，服务端调用）
 * 处理词库无法判断的模糊内容
 */
export async function aiFilter(
  text: string,
  apiKey: string,
): Promise<FilterResult> {
  // 先跑词库
  const quick = quickFilter(text)
  if (quick.level === 'block') return quick

  // 词库通过的，AI 做二次确认
  const prompt = `你是内容安全审核员。请判断以下用户文本是否可以安全发布到社区（一个游戏战术讨论社区）。

审核标准：
- ❌ 政治敏感内容、攻击领导人、分裂国家 → BLOCK
- ❌ 色情、裸露、性暗示、约炮 → BLOCK
- ❌ 暴力威胁、恐怖主义、自残 → BLOCK
- ❌ 赌博、诈骗、传销、非法集资 → BLOCK
- ❌ 人身攻击、种族歧视、地域黑 → BLOCK
- ❌ 广告、引流、联系方式 → BLOCK
- ⚠️ 脏话/骂人但非严重 → REVIEW
- ✅ 正常游戏战术讨论、阵容推荐、攻略分享 → PASS

只回复一个词：PASS、REVIEW 或 BLOCK（大写），后面可以加一句简短原因。`

  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    })
    const data = await resp.json()
    const verdict = data.choices?.[0]?.message?.content?.trim().toUpperCase() || 'REVIEW'

    if (verdict.startsWith('PASS')) {
      return { allowed: true, level: 'pass', reason: 'AI审核通过', flags: [] }
    } else if (verdict.startsWith('BLOCK')) {
      return { allowed: false, level: 'block', reason: verdict, flags: ['ai_blocked'] }
    } else {
      return { allowed: false, level: 'review', reason: verdict, flags: ['ai_review'] }
    }
  } catch {
    // AI 不可用时降级为词库结果
    if (quick.level === 'review') {
      return { allowed: false, level: 'review', reason: 'AI不可用，需人工审核', flags: ['ai_unavailable'] }
    }
    return quick
  }
}
