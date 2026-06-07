import type { MatchEntry, MatchResult, MatchStats, MatchImportResult, PlaySide } from '../types'
import maps from './maps'
import agents from './agents'

const STORAGE_KEY = 'val-tactics-match-history'

// ====== CRUD ======

export function loadMatches(): MatchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMatches(matches: MatchEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches))
}

export function addMatch(entry: MatchEntry): MatchEntry[] {
  const matches = loadMatches()
  matches.push(entry)
  matches.sort((a, b) => b.timestamp - a.timestamp)
  saveMatches(matches)
  return matches
}

export function updateMatch(id: string, updates: Partial<MatchEntry>): MatchEntry[] {
  const matches = loadMatches()
  const idx = matches.findIndex(m => m.id === id)
  if (idx === -1) return matches
  matches[idx] = { ...matches[idx], ...updates }
  saveMatches(matches)
  return matches
}

export function deleteMatch(id: string): MatchEntry[] {
  const matches = loadMatches().filter(m => m.id !== id)
  saveMatches(matches)
  return matches
}

// ====== CSV 解析 ======

/** 尝试将字符串标准化为地图ID */
function resolveMap(raw: string): string | null {
  const s = raw.trim()
  // 直接ID匹配
  const byId = maps.find(m => m.id.toLowerCase() === s.toLowerCase())
  if (byId) return byId.id
  // 中文名匹配
  const byCN = maps.find(m => m.name === s)
  if (byCN) return byCN.id
  // 英文名匹配
  const byEN = maps.find(m => m.nameEn.toLowerCase() === s.toLowerCase())
  if (byEN) return byEN.id
  // 模糊中文（去掉"地图"后缀等）
  const byFuzzy = maps.find(m => s.includes(m.name) || m.name.includes(s))
  if (byFuzzy) return byFuzzy.id
  return null
}

/** 将字符串标准化为特工ID */
function resolveAgent(raw: string): { id: string; role: string } | null {
  const s = raw.trim()
  const a = agents.find(ag =>
    ag.id.toLowerCase() === s.toLowerCase() ||
    ag.name === s ||
    ag.nameEn.toLowerCase() === s.toLowerCase()
  )
  return a ? { id: a.id, role: a.role } : null
}

/** 解析胜负 */
function resolveResult(raw: string): MatchResult | null {
  const s = raw.trim().toLowerCase()
  if (['胜', '赢', 'win', 'w', 'v', '✓'].some(x => s.includes(x))) return 'win'
  if (['负', '输', 'loss', 'lose', 'l', 'x', '✗'].some(x => s.includes(x))) return 'loss'
  if (['平', 'draw', 'd', 'tie', '—', '-'].some(x => s.includes(x))) return 'draw'
  return null
}

/** 解析开局方 */
function resolveSide(raw: string): PlaySide | null {
  const s = raw.trim().toLowerCase()
  if (['攻', '进攻', 'attack', 'atk', 'a', 't'].some(x => s === x || s.startsWith(x))) return 'attack'
  if (['守', '防守', 'defense', 'def', 'd', 'ct'].some(x => s === x || s.startsWith(x))) return 'defense'
  return null
}

/** 安全整数解析 */
function safeInt(s: string): number | null {
  const n = parseInt(s.trim(), 10)
  return isNaN(n) ? null : n
}

/** 安全浮点数解析 */
function safeFloat(s: string): number | null {
  const n = parseFloat(s.trim())
  return isNaN(n) ? null : n
}

export function importCsv(text: string): MatchImportResult {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length === 0) {
    return { entries: [], errors: ['无有效数据行'], warningCount: 0 }
  }

  // 检测首行是否为表头
  const headerKeywords = ['地图', 'map', '特工', 'agent', '结果', 'result', 'k', '杀', 'acs']
  let startIdx = 0
  const firstLine = lines[0].toLowerCase()
  if (headerKeywords.some(k => firstLine.includes(k))) {
    startIdx = 1
  }

  const entries: MatchEntry[] = []
  const errors: string[] = []
  let warningCount = 0

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    // 支持逗号或Tab分隔
    const sep = line.includes('\t') ? '\t' : ','
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))

    if (cols.length < 7) {
      errors.push(`第${i + 1}行：列数不足（至少需要地图/特工/结果/K/D/A/开局方 7列），已跳过`)
      warningCount++
      continue
    }

    const mapId = resolveMap(cols[0])
    if (!mapId) {
      errors.push(`第${i + 1}行：无法识别地图 "${cols[0]}"，已跳过`)
      warningCount++
      continue
    }

    const agent = resolveAgent(cols[1])
    if (!agent) {
      errors.push(`第${i + 1}行：无法识别特工 "${cols[1]}"，已跳过`)
      warningCount++
      continue
    }

    const result = resolveResult(cols[2])
    if (!result) {
      errors.push(`第${i + 1}行：无法识别结果 "${cols[2]}"（应为 胜/负/平），已跳过`)
      warningCount++
      continue
    }

    const kills = safeInt(cols[3])
    const deaths = safeInt(cols[4])
    const assists = safeInt(cols[5])
    if (kills === null || deaths === null || assists === null) {
      errors.push(`第${i + 1}行：K/D/A 必须为数字，已跳过`)
      warningCount++
      continue
    }

    const side = resolveSide(cols[9] || cols[6])
    if (!side) {
      // 尝试从后面的列推断
      const altSide = resolveSide(cols[7] || cols[8] || cols[6])
      if (!altSide) {
        errors.push(`第${i + 1}行：无法识别开局方，已跳过`)
        warningCount++
        continue
      }
    }

    const acs = cols[6] !== undefined ? safeFloat(cols[6]) : undefined
    const hsPercent = cols[7] !== undefined ? safeFloat(cols[7]) : undefined
    const rank = cols[8]?.trim() || undefined
    const finalSide = resolveSide(cols[9] || cols[6]) || resolveSide(cols[7]) || 'attack'

    entries.push({
      id: 'mh_' + Date.now().toString(36) + '_' + i,
      mapId,
      agentId: agent.id,
      role: agent.role,
      result,
      kills: kills!,
      deaths: deaths!,
      assists: assists!,
      acs: acs ?? undefined,
      hsPercent: hsPercent ?? undefined,
      rank: rank || undefined,
      side: finalSide,
      timestamp: Date.now() - (lines.length - i) * 1000, // 保持行顺序
    })
  }

  return { entries, errors, warningCount }
}

// ====== CSV 模板 ======

export function generateCsvTemplate(): string {
  const header = '地图,特工,结果,K,D,A,ACS,HS%,段位,开局方'
  const examples = [
    '亚海悬城,捷风,胜,22,12,6,245,23,超凡2,攻',
    '源工重镇,贤者,负,8,16,4,95,12,钻石1,守',
    '霓虹町,炼狱,胜,15,10,8,180,18,钻石3,攻',
  ]
  return [header, ...examples].join('\n')
}

// ====== 统计计算 ======

export function computeStats(matches: MatchEntry[]): MatchStats {
  const totalMatches = matches.length
  const wins = matches.filter(m => m.result === 'win').length
  const losses = matches.filter(m => m.result === 'loss').length
  const draws = matches.filter(m => m.result === 'draw').length
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

  const totalKills = matches.reduce((s, m) => s + m.kills, 0)
  const totalDeaths = matches.reduce((s, m) => s + m.deaths, 0)
  const kdRatio = totalDeaths > 0 ? +(totalKills / totalDeaths).toFixed(2) : totalKills

  const acsValues = matches.filter(m => m.acs !== undefined).map(m => m.acs!)
  const avgACS = acsValues.length > 0 ? Math.round(acsValues.reduce((s, v) => s + v, 0) / acsValues.length) : 0

  const hsValues = matches.filter(m => m.hsPercent !== undefined).map(m => m.hsPercent!)
  const avgHS = hsValues.length > 0 ? Math.round(hsValues.reduce((s, v) => s + v, 0) / hsValues.length) : 0

  // 按地图
  const perMapStats: MatchStats['perMapStats'] = {}
  for (const m of matches) {
    if (!perMapStats[m.mapId]) perMapStats[m.mapId] = { matches: 0, wins: 0, winRate: 0 }
    perMapStats[m.mapId].matches++
    if (m.result === 'win') perMapStats[m.mapId].wins++
  }
  for (const key of Object.keys(perMapStats)) {
    const s = perMapStats[key]
    s.winRate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0
  }

  // 按特工
  const perAgentStats: MatchStats['perAgentStats'] = {}
  for (const m of matches) {
    if (!perAgentStats[m.agentId]) {
      perAgentStats[m.agentId] = { matches: 0, wins: 0, winRate: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0, avgACS: 0 }
    }
    const s = perAgentStats[m.agentId]
    s.matches++
    if (m.result === 'win') s.wins++
  }
  for (const key of Object.keys(perAgentStats)) {
    const agentMatches = matches.filter(m => m.agentId === key)
    const s = perAgentStats[key]
    s.winRate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0
    s.avgKills = s.matches > 0 ? Math.round(agentMatches.reduce((sm, m) => sm + m.kills, 0) / s.matches) : 0
    s.avgDeaths = s.matches > 0 ? Math.round(agentMatches.reduce((sm, m) => sm + m.deaths, 0) / s.matches) : 0
    s.avgAssists = s.matches > 0 ? Math.round(agentMatches.reduce((sm, m) => sm + m.assists, 0) / s.matches) : 0
    const acsVals = agentMatches.filter(m => m.acs !== undefined).map(m => m.acs!)
    s.avgACS = acsVals.length > 0 ? Math.round(acsVals.reduce((sm, v) => sm + v, 0) / acsVals.length) : 0
  }

  // 最近10场趋势
  const sorted = [...matches].sort((a, b) => b.timestamp - a.timestamp)
  const recent = sorted.slice(0, 10).reverse()
  const recentTrend = {
    results: recent.map(m => m.result),
    kdRatios: recent.map(m => m.deaths > 0 ? +(m.kills / m.deaths).toFixed(2) : m.kills),
  }

  return {
    totalMatches, wins, losses, draws, winRate, kdRatio, avgACS, avgHS,
    perMapStats, perAgentStats, recentTrend,
  }
}

// ====== AI 上下文格式化 ======

export function formatMatchHistoryForAI(matches: MatchEntry[]): string {
  if (matches.length === 0) return ''

  const stats = computeStats(matches)
  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  // 总览
  let text = `### 比赛数据总览\n`
  text += `总场次：${stats.totalMatches} 场，${stats.wins}胜 ${stats.losses}负 ${stats.draws}平，胜率 ${stats.winRate}%，K/D比 ${stats.kdRatio}`
  if (stats.avgACS > 0) text += `，场均 ACS ${stats.avgACS}`
  if (stats.avgHS > 0) text += `，场均爆头率 ${stats.avgHS}%`
  text += '\n'

  // 最近趋势
  if (stats.recentTrend.results.length > 0) {
    const trendText = stats.recentTrend.results.map(r => r === 'win' ? '胜' : r === 'loss' ? '负' : '平').join(' → ')
    text += `\n最近${stats.recentTrend.results.length}场趋势：${trendText}\n`
  }

  // 按地图
  const mapEntries = Object.entries(stats.perMapStats).sort((a, b) => b[1].matches - a[1].matches)
  if (mapEntries.length > 0) {
    text += `\n### 按地图\n`
    for (const [mapId, s] of mapEntries) {
      text += `· ${mapName(mapId)}：${s.matches}场 ${s.wins}胜 胜率${s.winRate}%\n`
    }
  }

  // 按特工
  const agentEntries = Object.entries(stats.perAgentStats).sort((a, b) => b[1].matches - a[1].matches)
  if (agentEntries.length > 0) {
    text += `\n### 按特工\n`
    for (const [agentId, s] of agentEntries) {
      text += `· ${agentName(agentId)}：${s.matches}场 ${s.wins}胜 胜率${s.winRate}% KDA ${s.avgKills}/${s.avgDeaths}/${s.avgAssists}`
      if (s.avgACS > 0) text += ` ACS ${s.avgACS}`
      text += '\n'
    }
  }

  // 最近10场详细
  const sorted = [...matches].sort((a, b) => b.timestamp - a.timestamp)
  const recent10 = sorted.slice(0, 10).reverse()
  if (recent10.length > 0) {
    text += `\n### 最近10场详细\n`
    for (const m of recent10) {
      const date = new Date(m.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      const resultText = m.result === 'win' ? '✅胜' : m.result === 'loss' ? '❌负' : '➖平'
      text += `${date} · ${mapName(m.mapId)} · ${agentName(m.agentId)} · ${m.side === 'attack' ? '进攻' : '防守'}方 · ${resultText} · KDA ${m.kills}/${m.deaths}/${m.assists}`
      if (m.acs) text += ` · ACS ${m.acs}`
      if (m.rank) text += ` · ${m.rank}`
      if (m.notes) text += ` · ${m.notes}`
      text += '\n'
    }
  }

  return text
}

/** 格式化单场比赛为AI分析文本 */
export function formatSingleMatchForAI(match: MatchEntry): string {
  const mapName = (id: string) => maps.find(m => m.id === id)?.name || id
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id

  return `### 选定分析的比赛
· 地图：${mapName(match.mapId)}
· 特工：${agentName(match.agentId)}（${match.role}）
· 开局方：${match.side === 'attack' ? '进攻' : '防守'}方
· 结果：${match.result === 'win' ? '胜' : match.result === 'loss' ? '负' : '平'}
· KDA：${match.kills}/${match.deaths}/${match.assists}
${match.acs ? `· ACS：${match.acs}\n` : ''}${match.hsPercent ? `· 爆头率：${match.hsPercent}%\n` : ''}${match.rank ? `· 段位：${match.rank}\n` : ''}${match.notes ? `· 备注：${match.notes}\n` : ''}
· 录入日期：${new Date(match.timestamp).toLocaleDateString('zh-CN')}
`
}

/** 创建新比赛ID */
export function createMatchId(): string {
  return 'mh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}
