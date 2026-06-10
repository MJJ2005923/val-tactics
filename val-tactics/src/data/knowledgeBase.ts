import agents from './agents'
import type { AgentPosition, AbilityShape, DrawPath, TextAnnotation, Marker } from '../types'
import tacticsGuide from '../../knowledge/战术术语.md?raw'
import mapCallouts from '../../knowledge/地图点位.md?raw'
import weaponsData from '../../knowledge/武器数据.md?raw'
import economySystem from '../../knowledge/经济系统.md?raw'
import teamComps from '../../knowledge/阵容思路.md?raw'
import abilityCombos from '../../knowledge/技能连招.md?raw'
import agentCounters from '../../knowledge/特工克制.md?raw'
import attackRoutes from '../../knowledge/进攻路线.md?raw'
import patchHistory from '../../knowledge/版本记录.md?raw'
import combatTips from '../../knowledge/实战技巧.md?raw'
import aimTraining from '../../knowledge/枪法训练.md?raw'
import beginnerGuide from '../../knowledge/新手必读.md?raw'

/** 地图列表（中文名 + 英文名 + 简要特征） */
const MAPS: { name: string; nameEn: string; desc: string }[] = [
  { name: '亚海悬城', nameEn: 'Ascent', desc: '双点地图，中路控制至关重要，A/B两点均有可破坏门扉' },
  { name: '源工重镇', nameEn: 'Bind', desc: '双点地图，无中路，有两个单向传送门连接AB点' },
  { name: '森寒冬港', nameEn: 'Icebox', desc: '双点地图，垂直空间多，狙击位丰富，A点有高空走道' },
  { name: '霓虹町', nameEn: 'Split', desc: '双点地图，中路高塔控制核心，上下层结构复杂' },
  { name: '深海明珠', nameEn: 'Pearl', desc: '双点地图，视野开阔，中路长廊为核心争夺区域' },
  { name: '裂变峡谷', nameEn: 'Fracture', desc: '双点地图，防守方被夹在中间，攻击方从两侧进攻' },
  { name: '隐士修所', nameEn: 'Haven', desc: '三点地图（唯一），A/B/C三路，C点独立远程' },
  { name: '日落之城', nameEn: 'Sunset', desc: '双点地图，洛杉矶风格街区，中路宽阔直通B点' },
  { name: '莲华古城', nameEn: 'Lotus', desc: '三点地图，旋转门+可破坏墙体，A/C点通过转门连接' },
  { name: '微风岛屿', nameEn: 'Breeze', desc: '双点地图，海滩主题，地图开阔，A点金字塔为核心' },
  { name: '幽邃地窖', nameEn: 'Abyss', desc: '双点地图，地底洞穴主题，多层结构，跌落区域多' },
  { name: '盐海矿镇', nameEn: 'Salt Mine', desc: '双点地图，矿场主题，窄通道与开阔矿区交替' },
]

/** 角色中文名映射 */
const ROLE_CN: Record<string, string> = {
  '决斗者': '决斗者（进点突破，对枪核心）',
  '先锋': '先锋（信息侦查，辅助突破）',
  '控场者': '控场者（烟雾分割，地图控制）',
  '哨卫': '哨卫（防守固守，区域封锁）',
}

/** 技能类型中文 */
const TYPE_CN: Record<string, string> = {
  smoke: '烟雾/遮蔽',
  flash: '闪光/致盲',
  damage: '伤害/输出',
  recon: '侦查/信息',
  control: '控制/减速',
  heal: '治疗/回复',
  mobility: '位移/传送',
}

/**
 * 构建完整的无畏契约知识库系统提示词
 */
export function buildKnowledgeBase(mapName: string, side: string, agentNames: string[]): string {
  const sideCN = side === 'attack' ? '进攻方' : '防守方'

  let kb = `你是「T教练」—— 无畏契约(VALORANT)战术教练AI。当前地图「${mapName}」（${sideCN}）。

=== 无畏契约 地图 ===
${MAPS.map(m => `· ${m.name}（${m.nameEn}）— ${m.desc}`).join('\n')}

=== 无畏契约 特工全技能 ===
`

  // 按角色分组
  const roleOrder = ['决斗者', '先锋', '控场者', '哨卫']
  for (const role of roleOrder) {
    const roleAgents = agents.filter(a => a.role === role)
    if (roleAgents.length === 0) continue
    kb += `\n## ${ROLE_CN[role] || role}\n`
    for (const agent of roleAgents) {
      kb += `\n### ${agent.name}（${agent.nameEn}）— ${role}\n`
      for (const ab of agent.abilities) {
        const typeLabel = TYPE_CN[ab.type] || ab.type
        kb += `- [${ab.key}] ${ab.name}（${ab.nameEn}）· ${typeLabel}：${ab.usage}\n`
      }
    }
  }

  // 场上特工
  if (agentNames.length > 0) {
    kb += `\n=== 场上阵容 ===\n`
    kb += `当前在场特工：${agentNames.join('、')}\n`
  }

  // 战术术语
  kb += `\n${tacticsGuide}\n`
  // 地图点位
  kb += `\n${mapCallouts}\n`
  // 武器数据
  kb += `\n${weaponsData}\n`
  // 经济系统
  kb += `\n${economySystem}\n`
  // 阵容思路
  kb += `\n${teamComps}\n`
  // 技能连招
  kb += `\n${abilityCombos}\n`
  // 特工克制
  kb += `\n${agentCounters}\n`
  // 进攻路线
  kb += `\n${attackRoutes}\n`
  // 版本记录
  kb += `\n${patchHistory}\n`
  // 实战技巧
  kb += `\n${combatTips}\n`
  // 枪法训练
  kb += `\n${aimTraining}\n`
  // 新手必读
  kb += `\n${beginnerGuide}\n`

  // 回答规范
  kb += `
=== 回答规范 ===
1. 用中文回答，简洁实用，像教练一样给出战术建议
2. 涉及技能时，使用中文名+快捷键（如「玉城(C)」）
3. 推荐阵容时考虑角色搭配（至少1烟1哨1信息）
4. 地图点位用通用叫法（A长/B小/中路/市场/车库等）
5. 回答末尾可附一句「更多战术问题可以继续问我」`

  return kb
}

/**
 * 返回当前场上特工名列表（去重）
 */
export function getAgentNames(agentIds: string[]): string[] {
  return agentIds
    .map(id => agents.find(a => a.id === id)?.name)
    .filter((v): v is string => !!v)
    .filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * 将当前战术板状态格式化为AI可读文本（基础信息）
 */
export function formatBoardStateForAI(
  mapName: string,
  side: string,
  agentPositions: AgentPosition[],
  abilityShapes: AbilityShape[],
  drawings: DrawPath[],
  textAnnotations: TextAnnotation[],
  markers: Marker[],
  roster: { attack: string[]; defense: string[] },
): string {
  const sideCN = side === 'attack' ? '进攻方' : '防守方'
  const agentName = (id: string) => agents.find(a => a.id === id)?.name || id
  const abilityInfo = (abilityId: string) => {
    const a = agents.find(ag => ag.abilities.some(ab => ab.id === abilityId))
    const ab = a?.abilities.find(x => x.id === abilityId)
    return ab ? `${a!.name} ${ab.name}(${ab.key})` : abilityId
  }

  let text = `=== 战术板实时状态 ===\n`
  text += `地图：${mapName} · ${sideCN}\n`

  // 阵容
  if (roster.attack.length > 0 || roster.defense.length > 0) {
    text += `\n阵容：\n`
    if (roster.attack.length > 0) text += `  进攻方：${roster.attack.map(agentName).join('、')}\n`
    if (roster.defense.length > 0) text += `  防守方：${roster.defense.map(agentName).join('、')}\n`
  }

  // 特工站位
  if (agentPositions.length > 0) {
    text += `\n特工站位（${agentPositions.length}个）：\n`
    const atk = agentPositions.filter(p => p.team === 'attack')
    const def = agentPositions.filter(p => p.team === 'defense')
    if (atk.length > 0) text += `  进攻方：${atk.map(p => `${agentName(p.agentId)}(${(p.x*100).toFixed(0)}%,${(p.y*100).toFixed(0)}%)`).join('、')}\n`
    if (def.length > 0) text += `  防守方：${def.map(p => `${agentName(p.agentId)}(${(p.x*100).toFixed(0)}%,${(p.y*100).toFixed(0)}%)`).join('、')}\n`
  }

  // 技能标记
  if (abilityShapes.length > 0) {
    text += `\n技能范围（${abilityShapes.length}个）：\n`
    // 按特工分组
    const grouped: Record<string, AbilityShape[]> = {}
    for (const s of abilityShapes) {
      const key = s.agentId
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(s)
    }
    for (const [agentId, shapes] of Object.entries(grouped)) {
      const abilities = shapes.map(s => abilityInfo(s.abilityId)).join('、')
      text += `  · ${agentName(agentId)}：${abilities}\n`
    }
  }

  // 技能标记点
  if (markers.length > 0) {
    text += `\n技能标记点（${markers.length}个）\n`
  }

  // 绘图
  if (drawings.length > 0) {
    const types = drawings.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    text += `\n绘图：${Object.entries(types).map(([t, n]) => `${n}个${t}`).join('、')}\n`
  }

  // 文字标注
  if (textAnnotations.length > 0) {
    text += `\n文字标注：${textAnnotations.length}个\n`
    for (const t of textAnnotations.slice(0, 5)) {
      text += `  · "${t.text}" (${(t.x*100).toFixed(0)}%,${(t.y*100).toFixed(0)}%)\n`
    }
    if (textAnnotations.length > 5) text += `  ...等${textAnnotations.length - 5}个\n`
  }

  return text
}
