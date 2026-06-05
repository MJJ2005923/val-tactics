import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('src/data/agents.ts', 'utf8');

const idx = c.lastIndexOf(']\r\nexport default');
if (idx < 0) { console.log('NOT FOUND'); process.exit(1); }

const newAgents = `  },
  {
    id: 'tejo', name: '钛狐', nameEn: 'Tejo', role: '先锋',
    abilities: [
      { id: 'tejo-c', name: '潜袭爬虫', nameEn: 'Stealth Drone', key: 'C', type: 'damage', iconUrl: '/images/abilities/tejo-c.png', description: '装备一架潜袭爬虫，按[射击]将爬虫抛向前方，直接控制其移动。再次按[射击]可触发脉冲，压制并揭露被击中的敌人。', usage: '按C抛出潜袭爬虫并控制移动，再次按射击触发脉冲压制揭露敌人。' },
      { id: 'tejo-q', name: '特快专递', nameEn: 'Special Delivery', key: 'Q', type: 'damage', iconUrl: '/images/abilities/tejo-q.png', description: '装备一颗粘性榴弹，按[射击]发射。榴弹会粘附击中的首个表面并爆炸，被爆炸波及的所有目标都会受到震荡和伤害。按[辅助射击]发射榴弹时，榴弹会在反弹一次后爆炸。', usage: '按Q发射粘性榴弹(右键反弹一次后爆炸)，爆炸造成震荡和伤害。' },
      { id: 'tejo-e', name: '精准投放', nameEn: 'Guided Salvo', key: 'E', type: 'damage', iconUrl: '/images/abilities/tejo-e.png', description: '装备一套战术投送系统。按[射击]在地图上最多选择两个目标位置。按[辅助射击]发射导弹，导弹可自动导航至目标位置，到达时多次引爆，造成伤害。', usage: '按E在地图选最多两个目标位置，右键发射自动导航导弹造成伤害。' },
      { id: 'tejo-x', name: '末日审判', nameEn: 'Armageddon', key: 'X', type: 'damage', iconUrl: '/images/abilities/tejo-x.png', description: '装备战术打击地图。按[射击]选择打击起点。[再次按射击键]设置终点并发动无人机空袭，沿所选路径进行地毯式爆破，造成致命伤害。', usage: '按X选择起点，再次按射击选终点发动地毯式空袭。' }
    ]
  },
  {
    id: 'veto', name: '禁灭', nameEn: 'Veto', role: '哨卫',
    abilities: [
      { id: 'veto-c', name: '涡流折跃', nameEn: 'Crosscut', key: 'C', type: 'control', iconUrl: '/images/abilities/veto-c.png', description: '装备一颗漩涡能量球。按[射击]将其放置于地面。在技能范围内且瞄准漩涡时，[激活]技能即可传送至漩涡所在位置。在购买阶段期间，可将能量球回收并[重新部署]。', usage: '按C放置漩涡能量球，瞄准时激活传送到漩涡处，购买阶段可回收重新部署。' },
      { id: 'veto-q', name: '裂变残片', nameEn: 'Chokehold', key: 'Q', type: 'control', iconUrl: '/images/abilities/veto-q.png', description: '装备一块由异变产生的黏液碎片。按[射击]将其掷出。碎片会在碰到地面时部署为陷阱，困住经过的敌人。被困敌人将受到[致聋]和[腐坏]效果。陷阱激活前可被敌人摧毁。', usage: '按Q投掷黏液碎片，部署陷阱困住敌人，致聋+腐坏敌人。' },
      { id: 'veto-e', name: '噬源体', nameEn: 'Interceptor', key: 'E', type: 'control', iconUrl: '/images/abilities/veto-e.png', description: '装备噬源体。按[射击]将其部署至目标位置。部署后，[再次使用]技能即可激活。激活后，噬源体将摧毁一切能从玩家身上弹开或被枪火自然摧毁的装置。噬源体可被敌人摧毁。', usage: '按E部署噬源体，再次激活后摧毁敌方弹射物和装置，可被敌人摧毁。' },
      { id: 'veto-x', name: '完全进化', nameEn: 'Evolution', key: 'X', type: 'control', iconUrl: '/images/abilities/veto-x.png', description: '立即进入完全变异形态，获得[作战强化]效果和再生能力，并免疫所有形式的减益效果。', usage: '按X进入完全变异形态，获得作战强化+再生+免疫所有减益。' }
    ]
  },
  {
    id: 'miks', name: '迷核', nameEn: 'Miks', role: '控场者',
    abilities: [
      { id: 'miks-c', name: '电音脉冲', nameEn: 'Starfall', key: 'C', type: 'smoke', iconUrl: '/images/abilities/miks-c.png', description: '装备电音脉冲。按[辅助射击]可在震荡输出与治疗输出之间切换。按[射击]投掷装置。落地时，电音脉冲会释放声波，对玩家造成震荡或治疗效果。', usage: '按C装备，右键切换震荡/治疗模式，左键投掷释放声波。' },
      { id: 'miks-q', name: '共振谐律', nameEn: 'Binary', key: 'Q', type: 'smoke', iconUrl: '/images/abilities/miks-q.png', description: '装备共振谐律。锁定一名队友并按下[射击]，为你和该队友激活[作战强化]效果和速度加成，每次击败都会刷新效果。按[辅助射击]让自己获得[作战强化]效果和速度加成。', usage: '按Q锁定队友，左键激活双方作战强化+加速(击败刷新)，右键只给自己。' },
      { id: 'miks-e', name: '声波帷幕', nameEn: 'Vertigo', key: 'E', type: 'smoke', iconUrl: '/images/abilities/miks-e.png', description: '装备地图定位仪。按[射击]设定位置。按[辅助射击]在选定位置释放烟雾。', usage: '按E打开定位仪，左键设定位置，右键释放烟雾。' },
      { id: 'miks-x', name: '音脉强袭', nameEn: 'Encore', key: 'X', type: 'smoke', iconUrl: '/images/abilities/miks-x.png', description: '装备音脉强袭。按[射击]积蓄能量并向前释放音波源光，击退目标，并对其造成[致聋]和[减速]。', usage: '按X蓄力释放音波源光，击退并致聋+减速目标。' }
    ]
  }\r\n`;

c = c.substring(0, idx) + newAgents + c.substring(idx);
writeFileSync('src/data/agents.ts', c);
console.log('Added 3 agents');
