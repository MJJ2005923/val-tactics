import type { AbilityShapeConfig } from '../types'

export type AbilityType = 'smoke' | 'flash' | 'damage' | 'recon' | 'control' | 'heal' | 'mobility'

export interface Ability {
  id: string
  name: string
  nameEn: string
  key: 'C' | 'Q' | 'E' | 'X'
  type: AbilityType
  iconUrl?: string
  description: string
  usage: string
}

export interface Agent {
  id: string
  name: string
  nameEn: string
  role: string
  abilities: Ability[]
}

// 英雄头像图片映射（developerName -> filename）
export const agentImages: Record<string, string> = {
  sage: 'thorne', jett: 'wushu', phoenix: 'phoenix', raze: 'clay',
  reyna: 'vampire', yoru: 'stealth', neon: 'sprinter', iso: 'sequoia',
  viper: 'pandemic', brimstone: 'sarge', omen: 'wraith', astra: 'rift',
  harbor: 'mage', clove: 'smonk', sova: 'hunter', breach: 'breach',
  fade: 'bountyhunter', gekko: 'aggrobot', skye: 'guide', kayo: 'grenadier',
  killjoy: 'killjoy', cypher: 'gumshoe', chamber: 'deadeye', deadlock: 'cable',
  vyse: 'cashew'
}

// 游戏内技能范围 (地图 1800x1200, 1m=7px, norm=0.0039)
const M = 7 / 1800 // 1米对应的标准化坐标

const typeDefaults: Record<AbilityType, AbilityShapeConfig> = {
  smoke:   { shape: 'circle', radius: 4.5 * M },     // 烟雾 ~4-5m
  flash:   { shape: 'cone', angle: 60, length: 15 * M },  // 闪光 15m
  damage:  { shape: 'circle', radius: 3.5 * M },     // 伤害 ~3-4m
  recon:   { shape: 'cone', angle: 50, length: 18 * M },  // 侦查 18m
  control: { shape: 'circle', radius: 5 * M },       // 控制 ~4-5m
  heal:    { shape: 'circle', radius: 4 * M },       // 治疗 ~3-6m
  mobility:{ shape: 'line', length: 8 * M, thickness: 0.008 }, // 位移 8m
}

// 每个技能根据游戏内实际数据的精确覆盖
const abilityOverrides: Record<string, Partial<AbilityShapeConfig>> = {
  // === 烟雾 (半径单位: 米) ===
  'brimstone-sky-smoke':      { radius: 4.15 * M },   // 4.15m
  'omen-dark-cover':          { radius: 4.1 * M },    // 4.1m
  'astra-nebula':             { radius: 4.75 * M },   // 4.75m 最大
  'viper-poison-cloud':       { radius: 4.5 * M },    // 4.5m
  'jett-cloudburst':          { radius: 3.5 * M },    // 3.5m 瞬发烟
  'harbor-cove':              { radius: 3.5 * M },    // 3.5m 护盾
  'clove-ruse':               { radius: 4.1 * M },    // 4.1m
  'cypher-cyber-cage':        { radius: 3.5 * M },    // 3.5m 网牢

  // === 燃烧弹/伤害 ===
  'brimstone-incendiary':     { radius: 4.0 * M },
  'phoenix-hot-hands':        { radius: 3.0 * M },
  'killjoy-nanoswarm':        { radius: 3.5 * M },
  'raze-paint-shells':        { radius: 2.5 * M },
  'gekko-mosh-pit':           { radius: 5.0 * M },
  'raze-boom-bot':            { radius: 2.0 * M },
  'kayo-frag':                { radius: 3.0 * M },
  'sova-shock-bolt':          { radius: 2.0 * M },
  'vyse-razorvine':           { radius: 3.0 * M },

  // === 终极技能 ===
  'brimstone-orbital-strike': { radius: 12.0 * M },
  'viper-snake-bite':         { radius: 4.0 * M },
  'viper-pit':                { radius: 12.0 * M },
  'raze-showstopper':         { radius: 3.5 * M },
  'kayo-null-cmd':             { radius: 9.0 * M },
  'killjoy-lockdown':          { radius: 9.0 * M },
  'deadlock-annihilation':     { radius: 7.0 * M },
  'breach-rolling-thunder':    { shape: 'cone', angle: 90, length: 35 * M },
  'sova-hunters-fury':         { shape: 'line', length: 40 * M, thickness: 0.016 },
  'fade-nightfall':            { shape: 'cone', angle: 70, length: 25 * M },

  // === 墙体 ===
  'viper-toxic-screen':       { shape: 'line', length: 65 * M, thickness: 0.003 },
  'sage-barrier-orb':         { shape: 'rect', length: 10 * M, width: 2.5 * M },
  'phoenix-blaze':            { shape: 'line', length: 12 * M, thickness: 0.003 },
  'harbor-high-tide':         { shape: 'line', length: 25 * M, thickness: 0.012 },
  'harbor-cascade':           { shape: 'rect', length: 4 * M, width: 2 * M },
  'deadlock-barrier-mesh':    { shape: 'line', length: 6 * M, thickness: 0.01 },
  'neon-relay-bolt':          { shape: 'circle', radius: 2 * M },
  'neon-fast-lane':           { shape: 'line', length: 40 * M, thickness: 0.003 },
  'neon-high-gear':           { shape: 'line', length: 6 * M, thickness: 0.003 },

  // === 侦查 ===
  'sova-recon-bolt':           { angle: 60, length: 20 * M },
  'sova-owl-drone':            { angle: 40, length: 15 * M },
  'fade-haunt':                { angle: 60, length: 18 * M },
  'killjoy-turret':            { shape: 'cone', angle: 100, length: 12 * M },
  'killjoy-alarmbot':          { angle: 60, length: 10 * M },
  'cypher-spycam':             { shape: 'cone', angle: 40, length: 15 * M },
  'gekko-thrash':              { angle: 50, length: 18 * M },
  'gekko-wingman':             { angle: 30, length: 12 * M },
  'skye-trailblazer':          { angle: 30, length: 15 * M },
  'skye-seekers':              { angle: 60, length: 20 * M },

  // === 闪光 ===
  'breach-flashpoint':         { angle: 70, length: 18 * M },
  'skye-guiding-light':        { angle: 60, length: 20 * M },
  'phoenix-curveball':         { shape: 'circle', radius: 4 * M },
  'kayo-flash':                { angle: 60, length: 15 * M },
  'yoru-blindside':            { angle: 50, length: 12 * M },
  'gekko-dizzy':               { angle: 50, length: 14 * M },
  'reyna-leer':                { shape: 'circle', radius: 2 * M },

  // === 减速/控制 ===
  'sage-slow-orb':             { radius: 4.5 * M },
  'astra-gravity-well':        { radius: 3.5 * M },
  'astra-nova-pulse':          { radius: 4.0 * M },
  'fade-seize':                { radius: 3.5 * M },
  'breach-aftershock':         { shape: 'rect', length: 4 * M, width: 1.5 * M },
  'breach-fault-line':         { shape: 'cone', angle: 40, length: 20 * M },
  'iso-contingency':           { shape: 'line', length: 12 * M, thickness: 0.003 },
  'iso-undercut':              { shape: 'rect', length: 28 * M, width: 8 * M },
  'iso-kill-contract':         { shape: 'rect', length: 56 * M, width: 24 * M },

  // === 治疗 ===
  'sage-healing-orb':          { radius: 3 * M },
  'sage-resurrection':         { radius: 2 * M },
  'skye-regrowth':             { radius: 6 * M },
  'reyna-devour':              { radius: 1 * M },
  'clove-pick-me-up':          { radius: 3 * M },

  // === 位移 ===
  'jett-tailwind':             { length: 18 * M, thickness: 0.003 },
  'jett-updraft':              { length: 4 * M, thickness: 0.008, iconOnly: true },
  'raze-blast-pack':           { length: 14 * M, thickness: 0.003 },
  'yoru-fakeout':              { shape: 'circle', radius: 2.5 * M },
  'yoru-gatecrash':            { shape: 'circle', radius: 2.5 * M },
  'yoru-dimensional-drift':    { shape: 'circle', radius: 2.5 * M },
  'omen-shrouded-step':        { shape: 'line', length: 8 * M, thickness: 0.003 },
  'omen-paranoia':             { shape: 'rect', length: 60 * M, width: 10 * M },
  'omen-from-the-shadows':     { shape: 'circle', radius: 2 * M },
  'chamber-rendezvous':        { shape: 'line', length: 12 * M, thickness: 0.006 },
  'chamber-trademark':         { radius: 3 * M },
}

export function getAbilityShapeConfig(abilityId: string): AbilityShapeConfig | null {
  const agent = agents.find(a => a.abilities.some(ab => ab.id === abilityId))
  if (!agent) return null
  const ability = agent.abilities.find(a => a.id === abilityId)
  if (!ability) return null
  const typeDefault = typeDefaults[ability.type]
  if (!typeDefault) return null
  const overrides = abilityOverrides[abilityId] || {}
  return { ...typeDefault, ...overrides }
}

const agents: Agent[] = [
  {
    id: 'sage', name: '贤者', nameEn: 'Sage', role: '哨卫',
    abilities: [
      { id: 'sage-slow-orb', name: '缓速灵球', nameEn: 'Slow Orb', key: 'C', type: 'control', iconUrl: '/images/abilities/sage-slow-orb.png', description: '装备一颗缓速灵球。按射击键向前投掷，落地后生成一片缓速区域，踏入的敌人移速大幅降低。', usage: '按C装备，鼠标左键投掷，落地形成减速场。' },
      { id: 'sage-healing-orb', name: '治愈灵球', nameEn: 'Healing Orb', key: 'E', type: 'heal', iconUrl: '/images/abilities/sage-healing-orb.png', description: '装备一颗治愈灵球。按射击键对准队友释放，持续回血。可按右键对自己使用。', usage: '按E装备，左键对队友治疗，右键自愈。' },
      { id: 'sage-barrier-orb', name: '冰墙', nameEn: 'Barrier Orb', key: 'Q', type: 'control', iconUrl: '/images/abilities/sage-barrier-orb.png', description: '装备冰墙灵球。按射击键在面前放置一堵坚实冰墙，阻挡视野和子弹。右键旋转方向。', usage: '按Q装备，左键放置冰墙，右键旋转方向。' },
      { id: 'sage-resurrection', name: '复活', nameEn: 'Resurrection', key: 'X', type: 'heal', iconUrl: '/images/abilities/sage-resurrection.png', description: '对准一名阵亡队友的尸体，按射击键将其复活并恢复满血。需要短暂引导时间。', usage: '按X，对准队友尸体，左键引导复活。' }
    ]
  },
  {
    id: 'jett', name: '婕提', nameEn: 'Jett', role: '决斗者',
    abilities: [
      { id: 'jett-cloudburst', name: '烟雾弹', nameEn: 'Cloudburst', key: 'C', type: 'smoke', iconUrl: '/images/abilities/jett-cloudburst.png', description: '投掷一颗烟雾弹，撞击地形后膨胀为球形烟雾，阻挡视野。飞行中移动鼠标可弯曲轨迹。', usage: '按C装备，左键投掷，飞行中移动鼠标控制轨迹。' },
      { id: 'jett-updraft', name: '上升气流', nameEn: 'Updraft', key: 'Q', type: 'mobility', iconUrl: '/images/abilities/jett-updraft.png', description: '瞬间将自己弹射到空中，到达常规跳跃无法企及的高处位置。', usage: '按Q立即向上弹射起飞。' },
      { id: 'jett-tailwind', name: '逐风', nameEn: 'Tailwind', key: 'E', type: 'mobility', iconUrl: '/images/abilities/jett-tailwind.png', description: '向移动方向快速冲刺一段距离。空中使用则向准星方向冲刺。', usage: '按E向移动方向冲刺，可在空中使用。' },
      { id: 'jett-blade-storm', name: '剑刃风暴', nameEn: 'Blade Storm', key: 'X', type: 'damage', iconUrl: '/images/abilities/jett-blade-storm.png', description: '装备五把精准飞刀。左键单发射击，击杀敌人恢复所有飞刀。右键一次性投掷所有剩余飞刀。', usage: '按X装备飞刀，左键精准射击，右键全投。' }
    ]
  },
  {
    id: 'phoenix', name: '不死鸟', nameEn: 'Phoenix', role: '决斗者',
    abilities: [
      { id: 'phoenix-blaze', name: '火墙', nameEn: 'Blaze', key: 'C', type: 'damage', iconUrl: '/images/abilities/phoenix-blaze.png', description: '装备一面火焰墙壁。按射击键在面前生成一道火墙，阻挡视野并对穿过的敌人造成伤害，同时可治疗自己。', usage: '按C装备，左键放置火墙，移动鼠标可弯曲墙体轨迹。' },
      { id: 'phoenix-curveball', name: '闪光弹', nameEn: 'Curveball', key: 'Q', type: 'flash', iconUrl: '/images/abilities/phoenix-curveball.png', description: '装备一颗弯曲闪光弹。左键向左弯曲，右键向右弯曲。爆炸后致盲范围内所有玩家。', usage: '按Q装备，左键向左弯曲投掷，右键向右弯。' },
      { id: 'phoenix-hot-hands', name: '烈焰之手', nameEn: 'Hot Hands', key: 'E', type: 'damage', iconUrl: '/images/abilities/phoenix-hot-hands.png', description: '在面前投掷一颗火焰灵球，落地形成燃烧区域，对敌人造成伤害并治疗自己。', usage: '按E装备，左键投掷，落地形成燃烧区。' },
      { id: 'phoenix-run-it-back', name: '归来', nameEn: 'Run it Back', key: 'X', type: 'damage', iconUrl: '/images/abilities/phoenix-run-it-back.png', description: '标记当前位置。技能持续期间若阵亡或倒计时结束，将自动回到标记位置并满血复活。', usage: '按X标记位置，持续时间内可冲锋，结束后回到标记点。' }
    ]
  },
  {
    id: 'raze', name: '雷兹', nameEn: 'Raze', role: '决斗者',
    abilities: [
      { id: 'raze-boom-bot', name: '爆破机器人', nameEn: 'Boom Bot', key: 'C', type: 'damage', iconUrl: '/images/abilities/raze-boom-bot.png', description: '部署一个沿直线前进的机器人，撞到墙壁会弹跳。发现敌人后锁定追踪并爆炸。', usage: '按C部署，机器人自动前进追踪爆炸。' },
      { id: 'raze-blast-pack', name: '炸药包', nameEn: 'Blast Pack', key: 'Q', type: 'mobility', iconUrl: '/images/abilities/raze-blast-pack.png', description: '投掷一个可粘附的炸药包。再次按技能键引爆，可以弹射自己或伤害敌人。', usage: '按Q投掷，再按Q引爆，可弹射跳跃。' },
      { id: 'raze-paint-shells', name: '彩雷弹', nameEn: 'Paint Shells', key: 'E', type: 'damage', iconUrl: '/images/abilities/raze-paint-shells.png', description: '投掷一颗手雷，落地后分裂为多颗小型手雷，在范围内多次爆炸。', usage: '按E投掷，落地后多段爆炸。' },
      { id: 'raze-showstopper', name: '终极技能', nameEn: 'Showstopper', key: 'X', type: 'damage', iconUrl: '/images/abilities/raze-showstopper.png', description: '装备一发火箭炮。按射击键发射火箭弹，在撞击点造成巨大范围伤害。', usage: '按X装备火箭炮，左键发射。' }
    ]
  },
  {
    id: 'reyna', name: '蕾娜', nameEn: 'Reyna', role: '决斗者',
    abilities: [
      { id: 'reyna-leer', name: '浮空之眼', nameEn: 'Leer', key: 'C', type: 'control', iconUrl: '/images/abilities/reyna-leer.png', description: '投掷一颗浮空眼球，在一定距离内悬停。注视眼球的敌人视野会变窄。眼球可被摧毁。', usage: '按C投掷浮空眼球，敌人视野变窄，可被射爆。' },
      { id: 'reyna-devour', name: '噬魂', nameEn: 'Devour', key: 'Q', type: 'heal', iconUrl: '/images/abilities/reyna-devour.png', description: '消耗一颗灵魂球，立即回复大量生命值。持续时间内过量治疗会转变为护盾。', usage: '按Q消耗灵魂球回血，超出血量变护盾。' },
      { id: 'reyna-dismiss', name: '消散', nameEn: 'Dismiss', key: 'E', type: 'mobility', iconUrl: '/images/abilities/reyna-dismiss.png', description: '消耗一颗灵魂球，短暂进入虚无状态，无法被瞄准，移动速度提升。', usage: '按E消耗灵魂球进入虚无，高速移动。' },
      { id: 'reyna-empress', name: '女皇之力', nameEn: 'Empress', key: 'X', type: 'damage', iconUrl: '/images/abilities/reyna-empress.png', description: '进入狂暴状态，射速和换弹速度大幅提升。击杀敌人自动回复生命值。', usage: '按X进入狂暴状态，大幅提升战斗能力。' }
    ]
  },
  {
    id: 'yoru', name: '夜露', nameEn: 'Yoru', role: '决斗者',
    abilities: [
      { id: 'yoru-fakeout', name: '假脚步声', nameEn: 'Fakeout', key: 'C', type: 'recon', iconUrl: '/images/abilities/yoru-fakeout.png', description: '发射一个可模拟脚步声的装置，迷惑敌人判断你的位置。', usage: '按C发射脚步声模拟器，迷惑敌人。' },
      { id: 'yoru-blindside', name: '致盲弹', nameEn: 'Blindside', key: 'Q', type: 'flash', iconUrl: '/images/abilities/yoru-blindside.png', description: '投掷一颗可在表面反弹的闪光弹，每弹一次缩短引爆时间。', usage: '按Q投掷，撞击表面反弹后引爆致盲。' },
      { id: 'yoru-gatecrash', name: '传送锚', nameEn: 'Gatecrash', key: 'E', type: 'recon', iconUrl: '/images/abilities/yoru-gatecrash.png', description: '放置一个传送信标，再次按E传送到信标处。信标对敌人不可见。', usage: '按E放置传送锚，再按E传送到锚点。' },
      { id: 'yoru-dimensional-drift', name: '空间漂移', nameEn: 'Dimensional Drift', key: 'X', type: 'recon', iconUrl: '/images/abilities/yoru-dimensional-drift.png', description: '进入异次元空间，对敌人不可见且无敌。可以自由移动到任何位置后退出。', usage: '按X进入隐身无敌状态，自由移动后退出。' }
    ]
  },
  {
    id: 'neon', name: '霓虹', nameEn: 'Neon', role: '决斗者',
    abilities: [
      { id: 'neon-fast-lane', name: '高速通道', nameEn: 'Fast Lane', key: 'C', type: 'control', iconUrl: '/images/abilities/neon-fast-lane.png', description: '向前发射两条能量线，它们随后会变成两道阻挡视线的静电墙。能量线只能向前延伸一小段距离，且会被墙面阻挡。', usage: '按C发射两条能量线，形成阻挡视线的静电墙。' },
      { id: 'neon-relay-bolt', name: '闪电弹球', nameEn: 'Relay Bolt', key: 'Q', type: 'control', iconUrl: '/images/abilities/neon-relay-bolt.png', description: '立即掷出一个能量箭，可反弹一次。每次击中表面时，能量箭都会造成震荡冲击，同时使其下方的地面通电。', usage: '按Q掷出能量箭，反弹后造成震荡冲击并通电地面。' },
      { id: 'neon-high-gear', name: '充能疾驰', nameEn: 'High Gear', key: 'E', type: 'control', iconUrl: '/images/abilities/neon-high-gear.png', description: '引导霓虹的力量，立即提升移动速度。充能完毕时，按辅助射击即可发动闪电滑行。每击败两名敌人，可重置滑行的充能。击败敌人可补充燃料。', usage: '按E充能加速，充能完毕按右键闪电滑行，击败两名敌人重置充能。' },
      { id: 'neon-overdrive', name: '超限暴走', nameEn: 'Overdrive', key: 'X', type: 'damage', iconUrl: '/images/abilities/neon-overdrive.png', description: '短时间内释放霓虹的全部力量与速度，补满燃料并获得一次滑行充能。按射击即可引导她的力量，发射一道高速且精准的闪电光束。击败敌人可重置效果持续时间。', usage: '按X进入超限暴走，补满燃料获得滑行充能，左键发射闪电光束，击败敌人刷新持续时间。' }
    ]
  },
  {
    id: 'iso', name: '壹决', nameEn: 'Iso', role: '决斗者',
    abilities: [
      { id: 'iso-contingency', name: '绝对屏障', nameEn: 'Contingency', key: 'C', type: 'control', iconUrl: '/images/abilities/iso-contingency.png', description: '将能量聚合为棱晶形态。按射击向前推出一道可阻挡子弹的能量墙。按辅助射击可以较慢速度推出能量墙。', usage: '按C装备，左键快速推出能量墙，右键较慢速度推出。' },
      { id: 'iso-undercut', name: '稳态剥离', nameEn: 'Undercut', key: 'Q', type: 'control', iconUrl: '/images/abilities/iso-undercut.png', description: '装备扰乱分子结构的能量箭。按射击将其向前掷出，对触碰到的所有玩家施加短暂的易伤与压制效果。此能量箭可穿透墙壁等固体障碍。', usage: '按Q装备能量箭，左键掷出穿透墙壁，触碰敌人施加易伤与压制。' },
      { id: 'iso-double-tap', name: '战斗心流', nameEn: 'Double Tap', key: 'E', type: 'damage', iconUrl: '/images/abilities/iso-double-tap.png', description: '集中意念获得一道护盾，可吸收一次任意来源的伤害，加快换弹速度，并进入心流状态。在此状态期间，受到你伤害的敌人会在被击败时生成一颗能量球。射击此球体可刷新当前存在的护盾和心流状态，或生成一道新护盾。', usage: '按E获得护盾和心流，击败受伤害敌人产生能量球，射击球体刷新护盾。' },
      { id: 'iso-kill-contract', name: '决斗通牒', nameEn: 'Kill Contract', key: 'X', type: 'damage', iconUrl: '/images/abilities/iso-kill-contract.png', description: '构筑一座异次元竞技场。按射击发出一道穿越战场的能量矩阵，将命中的首名敌人拉进竞技场，双方同时获得治疗，并展开一对一决斗。', usage: '按X发出能量矩阵，命中首名敌人拉入1v1竞技场决斗。' }
    ]
  },
  {
    id: 'viper', name: '蝰蛇', nameEn: 'Viper', role: '控场者',
    abilities: [
      { id: 'viper-snake-bite', name: '蛇吻', nameEn: 'Snake Bite', key: 'C', type: 'damage', iconUrl: '/images/abilities/viper-snake-bite.png', description: '装备化学品发射器，按射击即可射出一个触地即碎的化学容器，碎裂后会留下一滩化学溶液，对范围内的目标造成伤害并施加易伤。', usage: '按C装备发射器，左键射出化学容器，碎裂后形成化学溶液造成伤害和易伤。' },
      { id: 'viper-poison-cloud', name: '瘴云', nameEn: 'Poison Cloud', key: 'Q', type: 'smoke', iconUrl: '/images/abilities/viper-poison-cloud.png', description: '装备气雾喷射器，按射击将其掷出，该装置会一直存在至回合结束。按辅助射击可轻抛。再次按技能键可消耗燃料生成一团化学烟雾，消耗燃料对其中的敌人造成腐坏。回合开始前，可拾取喷射器将其重新部署。在回合中，此技能可以多次重复使用。', usage: '按Q装备喷射器，左键掷出右键轻抛，再按Q生成毒雾消耗燃料造成腐坏，可回收重新部署多次使用。' },
      { id: 'viper-toxic-screen', name: '毒幕', nameEn: 'Toxic Screen', key: 'E', type: 'smoke', iconUrl: '/images/abilities/viper-toxic-screen.png', description: '装备可穿越地形的气雾喷射器，按射击沿一条直线部署气雾喷射器阵列。再次按技能键可产生一道气雾幕墙，消耗燃料对穿过幕墙的敌人造成腐坏。此技能可以多次重复使用。', usage: '按E部署喷射器阵列，再按E激活毒幕消耗燃料造成腐坏，可多次使用。' },
      { id: 'viper-pit', name: '蝰腹', nameEn: "Viper's Pit", key: 'X', type: 'control', iconUrl: '/images/abilities/viper-pit.png', description: '装备化学喷雾器，按射击即可朝蝰蛇的四周喷射化学气雾，产生大片云雾，使范围内的玩家视野收缩并使敌人受到腐坏效果。按住技能键可使气雾提前消散。', usage: '按X装备喷雾器，左键喷射化学气雾产生大片云雾，敌人视野收缩并受腐坏，按住技能键提前消散。' }
    ]
  },
  {
    id: 'brimstone', name: '炼狱', nameEn: 'Brimstone', role: '控场者',
    abilities: [
      { id: 'brimstone-stim-beacon', name: '振奋信标', nameEn: 'Stim Beacon', key: 'C', type: 'control', iconUrl: '/images/abilities/brimstone-stim-beacon.png', description: '立即向前方投掷振奋信标，它在落地后会生成一片增益区域，给予其中的玩家作战强化和加速效果。', usage: '按C投掷信标，生成增益区域提供作战强化和加速。' },
      { id: 'brimstone-incendiary', name: '燃烧榴弹', nameEn: 'Incendiary', key: 'Q', type: 'damage', iconUrl: '/images/abilities/brimstone-incendiary.png', description: '装备燃烧弹发射器。按射击发射一枚榴弹，在落地停稳后引爆，生成一片持续燃烧的区域，对进入其中的玩家造成伤害。', usage: '按Q装备发射器，左键发射榴弹，引爆后形成持续燃烧区。' },
      { id: 'brimstone-sky-smoke', name: '空投烟幕', nameEn: 'Sky Smoke', key: 'E', type: 'smoke', iconUrl: '/images/abilities/brimstone-sky-smoke.png', description: '装备战术地图。按射击设定烟幕落地的位置。按辅助射击以确认，呼叫历久不散的烟云来阻碍该选定区域的视野。', usage: '按E打开战术地图，左键设定位置，右键确认呼叫烟幕。' },
      { id: 'brimstone-orbital-strike', name: '天基光束', nameEn: 'Orbital Strike', key: 'X', type: 'damage', iconUrl: '/images/abilities/brimstone-orbital-strike.png', description: '装备战术地图。按射击向选定位置发射轨道激光炮，对区域内的玩家造成高额持续伤害。', usage: '按X打开地图，左键选定位置发射轨道激光炮造成高额伤害。' }
    ]
  },
  {
    id: 'omen', name: '欧门', nameEn: 'Omen', role: '控场者',
    abilities: [
      { id: 'omen-shrouded-step', name: '践影', nameEn: 'Shrouded Step', key: 'C', type: 'mobility', iconUrl: '/images/abilities/omen-shrouded-step.png', description: '装备践影技能，查看其范围指示器。按射击开始引导，然后传送至标记位置。', usage: '按C查看范围指示器，左键引导传送至标记位置。' },
      { id: 'omen-paranoia', name: '暗魇', nameEn: 'Paranoia', key: 'Q', type: 'flash', iconUrl: '/images/abilities/omen-paranoia.png', description: '装备致盲法球。按射击将其向前掷出，可使接触到的玩家短暂致聋和视野收缩。此投掷物可穿透墙体。', usage: '按Q装备致盲法球，左键掷出穿透墙体，致聋并收缩视野。' },
      { id: 'omen-dark-cover', name: '黑瘴', nameEn: 'Dark Cover', key: 'E', type: 'smoke', iconUrl: '/images/abilities/omen-dark-cover.png', description: '装备暗影法球，然后进入相位空间为法球选择目标。按技能键即可朝标记位置投掷暗影法球，创造一个长时间持续的暗影球体来遮挡视线。瞄准期间，按住射击可将标记移远，按住辅助射击可将标记移近。按装填即可切换至普通瞄准视野。', usage: '按E进入相位空间，左键投掷暗影法球形成遮挡球体，瞄准时左右键调整距离，装填键切换视野。' },
      { id: 'omen-from-the-shadows', name: '离魂', nameEn: 'From the Shadows', key: 'X', type: 'mobility', iconUrl: '/images/abilities/omen-from-the-shadows.png', description: '装备战术地图。按射击传送至选定位置，传送期间幽影会变为一团阴影，敌人可通过摧毁阴影来强制取消传送，幽影也能按装备来取消传送。', usage: '按X打开地图左键传送，传送期间化为阴影可被摧毁取消，按X取消传送。' }
    ]
  },
  {
    id: 'astra', name: '星礈', nameEn: 'Astra', role: '控场者',
    abilities: [
      { id: 'astra-gravity-well', name: '重力井', nameEn: 'Gravity Well', key: 'C', type: 'control', iconUrl: '/images/abilities/astra-gravity-well.png', description: '激活一颗星体形成重力井，将附近敌人拉向中心并造成易伤。', usage: '按C激活星体，将敌人拉入中心。' },
      { id: 'astra-nova-pulse', name: '新星脉冲', nameEn: 'Nova Pulse', key: 'Q', type: 'control', iconUrl: '/images/abilities/astra-nova-pulse.png', description: '激活一颗星体释放脉冲，在短延迟后眩晕范围内的敌人。', usage: '按Q激活星体，眩晕敌人。' },
      { id: 'astra-nebula', name: '星云', nameEn: 'Nebula', key: 'E', type: 'smoke', iconUrl: '/images/abilities/astra-nebula.png', description: '激活一颗星体形成烟雾。可提前将星体部署在任何位置。', usage: '按E激活星体形成烟雾弹。' },
      { id: 'astra-astral-form', name: '星界形态', nameEn: 'Astral Form', key: 'X', type: 'control', iconUrl: '/images/abilities/astra-astral-form.png', description: '进入星界形态，可在全局地图上任意位置部署技能。结束后返回肉身。', usage: '按X进入星界形态，全局部署技能。' }
    ]
  },
  {
    id: 'harbor', name: '海神', nameEn: 'Harbor', role: '控场者',
    abilities: [
      { id: 'harbor-cove', name: '护盾泡', nameEn: 'Cove', key: 'C', type: 'smoke', iconUrl: '/images/abilities/harbor-cove.png', description: '在面前生成一个由水构成的护盾泡，可阻挡子弹，内部队友受到保护。', usage: '按C生成水护盾，阻挡子弹。' },
      { id: 'harbor-cascade', name: '瀑布', nameEn: 'Cascade', key: 'Q', type: 'smoke', iconUrl: '/images/abilities/harbor-cascade.png', description: '发射一道水流瀑布，形成移动的烟雾墙，可推动敌人。', usage: '按Q发射瀑布，形成移动水墙。' },
      { id: 'harbor-high-tide', name: '高潮', nameEn: 'High Tide', key: 'E', type: 'smoke', iconUrl: '/images/abilities/harbor-high-tide.png', description: '发射一道水墙，形成持续烟雾屏障。穿过水墙的敌人移速降低。', usage: '按E发射水墙，减速穿过敌人。' },
      { id: 'harbor-reckoning', name: '清算', nameEn: 'Reckoning', key: 'X', type: 'control', iconUrl: '/images/abilities/harbor-reckoning.png', description: '释放大量水流冲击前方区域，被击中的敌人受到伤害并被标记。', usage: '按X释放水流冲击，标记并伤害敌人。' }
    ]
  },
  {
    id: 'clove', name: '暮蝶', nameEn: 'Clove', role: '控场者',
    abilities: [
      { id: 'clove-pick-me-up', name: '起来吧', nameEn: 'Pick Me Up', key: 'C', type: 'heal', iconUrl: '/images/abilities/clove-pick-me-up.png', description: '消耗一颗灵魂能量，短暂提升自己的生命值和移速。', usage: '按C消耗灵魂能量，短暂恢复。' },
      { id: 'clove-meddle', name: '干扰', nameEn: 'Meddle', key: 'Q', type: 'control', iconUrl: '/images/abilities/clove-meddle.png', description: '投掷一颗干扰弹，使范围内敌人短暂无法使用技能。', usage: '按Q投掷，使敌人技能失效。' },
      { id: 'clove-ruse', name: '伪装', nameEn: 'Ruse', key: 'E', type: 'smoke', iconUrl: '/images/abilities/clove-ruse.png', description: '在指定位置生成持续烟雾。阵亡后仍可使用此技能支援队友。', usage: '按E指定位置释放烟雾，死后仍可使用。' },
      { id: 'clove-not-dead-yet', name: '还没死', nameEn: 'Not Dead Yet', key: 'X', type: 'heal', iconUrl: '/images/abilities/clove-not-dead-yet.png', description: '被动：阵亡后短暂时间内可为自己复活一次。主动：激活时获得爆发移速。', usage: '阵亡后短暂时间内自动复活，按X可激活移速爆发。' }
    ]
  },
  {
    id: 'sova', name: '猎枭', nameEn: 'Sova', role: '先锋',
    abilities: [
      { id: 'sova-owl-drone', name: '枭型无人机', nameEn: 'Owl Drone', key: 'C', type: 'recon', iconUrl: '/images/abilities/sova-owl-drone.png', description: '部署一架可操控的无人机。飞行中可按射击键发射标记镖，标记命中的敌人。', usage: '按C部署无人机，操控飞行，左键发射标记镖。' },
      { id: 'sova-shock-bolt', name: '冲击箭', nameEn: 'Shock Bolt', key: 'Q', type: 'damage', iconUrl: '/images/abilities/sova-shock-bolt.png', description: '装备一把弓箭，发射冲击箭。撞击后释放伤害脉冲，可蓄力调整射程。', usage: '按Q装备弓，左键蓄力射击。' },
      { id: 'sova-recon-bolt', name: '侦察箭', nameEn: 'Recon Bolt', key: 'E', type: 'recon', iconUrl: '/images/abilities/sova-recon-bolt.png', description: '发射一支侦察箭，落地后持续扫描附近敌人位置并标记。可蓄力调整射程和弹跳次数。', usage: '按E装备弓，左键蓄力，右键切换弹跳次数。' },
      { id: 'sova-hunters-fury', name: '猎人之怒', nameEn: "Hunter's Fury", key: 'X', type: 'damage', iconUrl: '/images/abilities/sova-hunters-fury.png', description: '装备弓箭，发射三支高能穿透箭，可穿透墙壁，对沿途敌人造成伤害并标记。', usage: '按X装备，左键发射穿透箭，共三发。' }
    ]
  },
  {
    id: 'breach', name: '铁臂', nameEn: 'Breach', role: '先锋',
    abilities: [
      { id: 'breach-aftershock', name: '余震', nameEn: 'Aftershock', key: 'C', type: 'damage', iconUrl: '/images/abilities/breach-aftershock.png', description: '向墙壁释放能量冲击，穿透墙壁并震击后方敌人，造成伤害。', usage: '按C瞄准墙壁释放，穿透震击敌人。' },
      { id: 'breach-flashpoint', name: '闪光点', nameEn: 'Flashpoint', key: 'Q', type: 'flash', iconUrl: '/images/abilities/breach-flashpoint.png', description: '向墙壁发射闪光弹，穿透墙壁在另一侧引爆，致盲敌人。', usage: '按Q瞄准墙壁释放，穿透致盲。' },
      { id: 'breach-fault-line', name: '断层线', nameEn: 'Fault Line', key: 'E', type: 'control', iconUrl: '/images/abilities/breach-fault-line.png', description: '释放一道沿地面传播的冲击波，击晕直线上的敌人。可蓄力延长射程。', usage: '按E蓄力，释放地面冲击波眩晕敌人。' },
      { id: 'breach-rolling-thunder', name: '滚雷', nameEn: 'Rolling Thunder', key: 'X', type: 'control', iconUrl: '/images/abilities/breach-rolling-thunder.png', description: '释放一道巨大的扇形冲击波，击飞并眩晕大面积所有敌人。', usage: '按X释放扇形冲击波，击飞大范围敌人。' }
    ]
  },
  {
    id: 'fade', name: '黑梦', nameEn: 'Fade', role: '先锋',
    abilities: [
      { id: 'fade-prowler', name: '潜行者', nameEn: 'Prowler', key: 'C', type: 'recon', iconUrl: '/images/abilities/fade-prowler.png', description: '释放一只追踪猎犬，沿直线追踪被标记或受伤害的敌人。追上后咬住敌人使其暂时失明。', usage: '按C释放猎犬，自动追踪受伤敌人并致盲。' },
      { id: 'fade-seize', name: '捕获', nameEn: 'Seize', key: 'Q', type: 'control', iconUrl: '/images/abilities/fade-seize.png', description: '投掷一颗暗影灵球，落地形成束缚区，将范围内敌人拉向中心并减速。', usage: '按Q投掷，形成束缚区将敌人拉入中心。' },
      { id: 'fade-haunt', name: '噩梦之眼', nameEn: 'Haunt', key: 'E', type: 'recon', iconUrl: '/images/abilities/fade-haunt.png', description: '投掷一颗侦察球，落地后持续标记附近敌人位置。敌人可摧毁该球。', usage: '按E投掷侦察球，自动标记附近敌人。' },
      { id: 'fade-nightfall', name: '夜幕', nameEn: 'Nightfall', key: 'X', type: 'recon', iconUrl: '/images/abilities/fade-nightfall.png', description: '释放一道巨大的暗影冲击波，穿透整个地图，标记所有被击中的敌人并施加耳鸣效果。', usage: '按X释放全图冲击波，标记并致聋敌人。' }
    ]
  },
  {
    id: 'gekko', name: '盖可', nameEn: 'Gekko', role: '先锋',
    abilities: [
      { id: 'gekko-mosh-pit', name: '鱼池', nameEn: 'Mosh Pit', key: 'C', type: 'damage', iconUrl: '/images/abilities/gekko-mosh-pit.png', description: '投掷一颗海藻炸弹，落地形成持续伤害区域，对敌人造成伤害。', usage: '按C投掷，形成持续伤害区域。' },
      { id: 'gekko-wingman', name: '搭档', nameEn: 'Wingman', key: 'Q', type: 'recon', iconUrl: '/images/abilities/gekko-wingman.png', description: '派出小宠物向前搜索，发现敌人后追踪并眩晕。可用于安装/拆除爆能器。', usage: '按Q派出搭档，自动追踪敌人眩晕。' },
      { id: 'gekko-dizzy', name: '眩晕蛋', nameEn: 'Dizzy', key: 'E', type: 'flash', iconUrl: '/images/abilities/gekko-dizzy.png', description: '发射一颗宠物蛋到空中，向下喷射致盲气体，使注视它的敌人短暂失明。', usage: '按E发射到空中，向下致盲敌人。' },
      { id: 'gekko-thrash', name: '暴走', nameEn: 'Thrash', key: 'X', type: 'recon', iconUrl: '/images/abilities/gekko-thrash.png', description: '释放一只大型宠物向前冲锋，撞到敌人后爆炸将其束缚。可回收并重新使用。', usage: '按X释放冲锋宠物，撞到敌人后爆炸束缚。' }
    ]
  },
  {
    id: 'skye', name: '斯凯', nameEn: 'Skye', role: '先锋',
    abilities: [
      { id: 'skye-regrowth', name: '再生', nameEn: 'Regrowth', key: 'C', type: 'heal', iconUrl: '/images/abilities/skye-regrowth.png', description: '装备一个治疗光环，持续为范围内的队友回复生命值。消耗治疗能量池。', usage: '按C装备，持续治疗范围内队友，消耗能量。' },
      { id: 'skye-trailblazer', name: '开拓者', nameEn: 'Trailblazer', key: 'Q', type: 'recon', iconUrl: '/images/abilities/skye-trailblazer.png', description: '释放一只可控的猎鹰，向前飞行。按射击键释放闪光爆炸，致盲注视猎鹰的敌人。', usage: '按Q释放猎鹰，操控飞行，左键引爆闪光。' },
      { id: 'skye-guiding-light', name: '引路之光', nameEn: 'Guiding Light', key: 'E', type: 'flash', iconUrl: '/images/abilities/skye-guiding-light.png', description: '发射一颗光球，可操控其飞行方向。引爆后致盲敌人，致盲时间与引爆距离相关。', usage: '按E发射光球，操控方向，引爆致盲。' },
      { id: 'skye-seekers', name: '追猎者', nameEn: 'Seekers', key: 'X', type: 'recon', iconUrl: '/images/abilities/skye-seekers.png', description: '派出三只追踪精灵，自动搜索并锁定最近的三个敌人，追上后眩晕。', usage: '按X释放三只追踪精灵，自动锁敌。' }
    ]
  },
  {
    id: 'kayo', name: '恺宙', nameEn: 'KAY/O', role: '先锋',
    abilities: [
      { id: 'kayo-frag', name: '手雷', nameEn: 'FRAG/ment', key: 'C', type: 'damage', iconUrl: '/images/abilities/kayo-frag.png', description: '投掷一颗碎片手雷，落地后分四段爆炸，每段对范围内敌人造成伤害。', usage: '按C投掷，多段爆炸伤害。' },
      { id: 'kayo-flash', name: '闪光弹', nameEn: 'FLASH/drive', key: 'Q', type: 'flash', iconUrl: '/images/abilities/kayo-flash.png', description: '投掷一颗闪光弹，爆炸后致盲范围内敌人。可蓄力调整引爆时间。', usage: '按Q投掷闪光弹，蓄力控制引爆时间。' },
      { id: 'kayo-zero-point', name: '零秒点', nameEn: 'ZERO/point', key: 'E', type: 'control', iconUrl: '/images/abilities/kayo-zero-point.png', description: '发射一颗抑制刀，范围内的敌人暂时无法使用任何技能，且已激活技能被打断。', usage: '按E发射抑制刀，沉默敌人技能。' },
      { id: 'kayo-null-cmd', name: '无效指令', nameEn: 'NULL/cmd', key: 'X', type: 'control', iconUrl: '/images/abilities/kayo-null-cmd.png', description: '进入能量超载状态，释放大范围抑制脉冲，持续沉默周围敌人。若被击杀可被队友复活。', usage: '按X进入超载状态，持续大范围沉默敌人。' }
    ]
  },
  {
    id: 'killjoy', name: '奇乐', nameEn: 'Killjoy', role: '哨卫',
    abilities: [
      { id: 'killjoy-nanoswarm', name: '纳米蜂群', nameEn: 'Nanoswarm', key: 'C', type: 'damage', iconUrl: '/images/abilities/killjoy-nanoswarm.png', description: '投掷两颗纳米手雷。按技能键引爆，对范围内敌人造成持续伤害。', usage: '按C投掷，再按C引爆，持续伤害。' },
      { id: 'killjoy-alarmbot', name: '警报机器人', nameEn: 'Alarmbot', key: 'Q', type: 'recon', iconUrl: '/images/abilities/killjoy-alarmbot.png', description: '部署一个隐形警报机器人。敌人靠近后追踪并引爆，造成易伤效果。', usage: '按Q部署，敌人靠近自动追踪爆。' },
      { id: 'killjoy-turret', name: '炮塔', nameEn: 'Turret', key: 'E', type: 'damage', iconUrl: '/images/abilities/killjoy-turret.png', description: '部署一座自动炮塔，持续扫描前方扇形区域并射击敌人。可收回重新部署。', usage: '按E部署炮塔，自动扫描射击。' },
      { id: 'killjoy-lockdown', name: '封锁', nameEn: 'Lockdown', key: 'X', type: 'control', iconUrl: '/images/abilities/killjoy-lockdown.png', description: '部署一个大型封锁装置，经过长蓄力后释放冲击波，将范围内所有敌人禁锢。', usage: '按X部署，蓄力后大范围禁锢敌人。' }
    ]
  },
  {
    id: 'cypher', name: '零', nameEn: 'Cypher', role: '哨卫',
    abilities: [
      { id: 'cypher-tripwire', name: '绊索', nameEn: 'Tripwire', key: 'C', type: 'control', iconUrl: '/images/abilities/cypher-tripwire.png', description: '在两堵墙之间拉一条隐形绊索。敌人触发后被短暂暴露位置并减速。', usage: '按C在两面墙之间部署绊线。' },
      { id: 'cypher-cyber-cage', name: '网牢', nameEn: 'Cyber Cage', key: 'Q', type: 'smoke', iconUrl: '/images/abilities/cypher-cyber-cage.png', description: '远程激活一个网笼装置，形成空心烟雾区域。穿过时发出声音提示。', usage: '按Q激活网笼，形成中空烟雾。' },
      { id: 'cypher-spycam', name: '侦察摄像头', nameEn: 'Spycam', key: 'E', type: 'recon', iconUrl: '/images/abilities/cypher-spycam.png', description: '部署一个远程摄像头，可操控查看周围情况。按射击键发射标记镖标记敌人。', usage: '按E部署摄像头，操控观察，左键标记。' },
      { id: 'cypher-neural-theft', name: '神经窃取', nameEn: 'Neural Theft', key: 'X', type: 'recon', iconUrl: '/images/abilities/cypher-neural-theft.png', description: '对准一名阵亡敌人使用，短暂揭示所有敌方位置。', usage: '按X对准尸体使用，全图揭示敌人。' }
    ]
  },
  {
    id: 'chamber', name: '钱包', nameEn: 'Chamber', role: '哨卫',
    abilities: [
      { id: 'chamber-trademark', name: '标记', nameEn: 'Trademark', key: 'C', type: 'control', iconUrl: '/images/abilities/chamber-trademark.png', description: '放置一个扫描装置，有敌人进入范围后触发，减速区域内所有敌人。', usage: '按C部署扫描器，触发后减速敌人。' },
      { id: 'chamber-headhunter', name: '猎头者', nameEn: 'Headhunter', key: 'Q', type: 'damage', iconUrl: '/images/abilities/chamber-headhunter.png', description: '装备一把高精度手枪。按右键开镜，精准射击。共8发子弹，每击杀一人补一发。', usage: '按Q装备精准手枪，右键开镜射击。' },
      { id: 'chamber-rendezvous', name: '会合点', nameEn: 'Rendezvous', key: 'E', type: 'mobility', iconUrl: '/images/abilities/chamber-rendezvous.png', description: '放置两个传送信标。在范围内按E可瞬间传送到另一信标处。', usage: '按E放置信标，再按E传送。' },
      { id: 'chamber-tour-de-force', name: '终极力量', nameEn: 'Tour De Force', key: 'X', type: 'damage', iconUrl: '/images/abilities/chamber-tour-de-force.png', description: '装备一把威力巨大的狙击步枪。击杀敌人后产生减速区域。', usage: '按X装备终极狙击枪，击杀产生减速场。' }
    ]
  },
  {
    id: 'deadlock', name: '铁壁', nameEn: 'Deadlock', role: '哨卫',
    abilities: [
      { id: 'deadlock-gravnet', name: '重力网', nameEn: 'GravNet', key: 'C', type: 'control', iconUrl: '/images/abilities/deadlock-gravnet.png', description: '投掷一颗重力网手雷，爆炸后将范围内敌人拉向地面并强制蹲下。', usage: '按C投掷，爆炸后强制拉倒敌人。' },
      { id: 'deadlock-sonic-sensor', name: '声波传感器', nameEn: 'Sonic Sensor', key: 'Q', type: 'recon', iconUrl: '/images/abilities/deadlock-sonic-sensor.png', description: '部署一个声波传感器，检测到敌人移动时释放声波震动，使敌人减速。', usage: '按Q部署，检测移动后震动减速。' },
      { id: 'deadlock-barrier-mesh', name: '屏障网', nameEn: 'Barrier Mesh', key: 'E', type: 'control', iconUrl: '/images/abilities/deadlock-barrier-mesh.png', description: '部署一道网状屏障，阻挡通过并吸收子弹伤害。', usage: '按E部署网状屏障。' },
      { id: 'deadlock-annihilation', name: '湮灭', nameEn: 'Annihilation', key: 'X', type: 'control', iconUrl: '/images/abilities/deadlock-annihilation.png', description: '发射一颗强力能量弹，追逐第一名被击中的敌人，将其禁锢并拖行。', usage: '按X发射能量弹，追捕并禁锢敌人。' }
    ]
  },
  {
    id: 'vyse', name: '钛狐', nameEn: 'Vyse', role: '哨卫',
    abilities: [
      { id: 'vyse-razorvine', name: '剃刀藤', nameEn: 'Razorvine', key: 'C', type: 'damage', iconUrl: '/images/abilities/vyse-razorvine.png', description: '部署一组剃刀藤蔓陷阱，敌人踩入后受到持续伤害并减速。', usage: '按C部署藤蔓陷阱，踩入受伤减速。' },
      { id: 'vyse-arc-rose', name: '弧玫瑰', nameEn: 'Arc Rose', key: 'Q', type: 'flash', iconUrl: '/images/abilities/vyse-arc-rose.png', description: '投掷一颗可在表面弹射的闪光装置，引爆后致盲敌人。', usage: '按Q投掷弹射，引爆致盲。' },
      { id: 'vyse-shear', name: '剪切', nameEn: 'Shear', key: 'E', type: 'control', iconUrl: '/images/abilities/vyse-shear.png', description: '在两面墙之间生成一道激光绊线，触发后短暂暴露并伤害敌人。', usage: '按E在墙间部署激光绊线。' },
      { id: 'vyse-steel-garden', name: '钢铁花园', nameEn: 'Steel Garden', key: 'X', type: 'control', iconUrl: '/images/abilities/vyse-steel-garden.png', description: '召唤大片金属荆棘，覆盖广阔区域，对敌人造成伤害并限制移动。', usage: '按X召唤金属荆棘覆盖区域。' }
    ]
  }
]

export default agents
