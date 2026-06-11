/**
 * 内容安全敏感词库
 * 按类别分级管理，用于社区内容审核
 * 定期更新维护
 */

// 🔴 一级：政治敏感 — 直接拦截
export const POLITICAL_WORDS = [
  '习近平', '习主席', '毛主席', '毛泽东', '周恩来', '邓小平', '江泽民', '胡锦涛', '温家宝', '李克强',
  '共产党', '中共', '中国共产党', '党中央', '中央领导人', '国家主席', '国务院',
  '六四', '天安门', '法轮功', 'falun', '达赖', '达赖喇嘛', '藏独', '疆独', '台独',
  '反共', '反华', '颠覆', '暴动', '政变', '文革', '文化大革命',
  '江泽民', '李鹏', '朱镕基', '李长春', '贺国强', '周永康', '薄熙来',
  '坦克人', '活摘', '退党', '三退',
]

// 🔴 一级：色情/成人 — 直接拦截
export const ADULT_WORDS = [
  '裸聊', '约炮', '一夜情', '援交', '嫖娼', '卖淫', '小姐', '上门服务',
  '成人', '色情', '黄色', 'AV', '三级片', '毛片', '黄片', '无码', '有码',
  '大保健', '桑拿', '按摩', '特殊服务', '全套', '半套',
  '草榴', '1024', '91视频', '91自拍', '福利姬', '福利视频',
  '做爱', '性交', '口交', '肛交', '自慰', '手淫', '阳具', '阴部', '乳房', '乳头',
  '操你', '操死', '日你', '日死', '干你', '干死',
]

// 🟡 二级：暴力/恐怖 — 直接拦截
export const VIOLENCE_WORDS = [
  '杀人', '砍死', '弄死', '打死', '炸死', '枪毙', '屠杀', '灭门',
  '恐怖组织', '恐怖分子', 'ISIS', '基地组织', '东突', '圣战',
  '自制炸药', '自制枪支', '买枪', '买刀杀人',
  '砍人', '捅人', '割喉', '碎尸', '分尸', '肢解',
]

// 🟡 二级：赌博/诈骗 — 直接拦截
export const GAMBLE_SCAM_WORDS = [
  '赌博', '赌场', '博彩', '彩票', '投注', '时时彩', '六合彩', '北京赛车',
  '刷单', '兼职刷单', '日赚', '在家赚钱', '高额回报', '投资理财',
  '网银', '银行卡', '密码', '验证码', '身份证号',
  '赌博网站', '博彩网站', '线上赌场', '真人视讯', 'AG视讯', 'BBIN',
  '套现', '花呗套现', '借呗', '网贷', '贷款',
]

// 🟡 二级：歧视/仇恨 — 直接拦截
export const HATE_WORDS = [
  '支那', '东亚病夫', '黄祸', '白皮猪', '黑鬼', '尼哥', 'nigger', 'faggot',
  '小日本', '日本鬼子', '棒子', '阿三', '毛子',
  '地域黑', '河南人偷', '东北人', '广东人吃', '新疆人',
]

// 🟢 三级：垃圾广告模式（正则匹配）
export const SPAM_PATTERNS = [
  /(v|V|薇|微)[\s_]*(信|x|X|xin|Xin)[\s_]*[:：]?\s*[a-zA-Z0-9_-]{5,}/,  // 微信号
  /(q|Q|扣|抠)[\s_]*(q|Q)[\s_]*[:：]?\s*\d{5,}/,  // QQ号
  /(http[s]?:\/\/[^\s]{5,})/,  // 外部链接（需审核）
  /(1[3-9]\d)\s*-?\s*(\d{4})\s*-?\s*(\d{4})/,  // 手机号
  /(加|联系|咨询)[\s\S]{0,5}(微信|QQ|电话|手机)/,  // 联系方式诱导
]

// 所有一级词汇合并（快速匹配用）
export const BLOCK_WORDS = new Set([
  ...POLITICAL_WORDS,
  ...ADULT_WORDS,
  ...VIOLENCE_WORDS,
  ...GAMBLE_SCAM_WORDS,
  ...HATE_WORDS,
])

/**
 * 快速检查文本是否包含敏感词
 * @returns { blocked: boolean, words: string[] } 是否拦截 + 命中词汇
 */
export function checkWords(text: string): { blocked: boolean; words: string[] } {
  const lower = text.toLowerCase()
  const hits: string[] = []
  for (const word of BLOCK_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      hits.push(word)
    }
  }
  return { blocked: hits.length > 0, words: hits }
}

/**
 * 检查垃圾广告特征
 */
export function checkSpam(text: string): { isSpam: boolean; reasons: string[] } {
  const reasons: string[] = []
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(`匹配模式: ${pattern.source.slice(0, 40)}...`)
    }
  }
  return { isSpam: reasons.length > 0, reasons }
}
