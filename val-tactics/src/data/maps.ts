export interface MapData {
  id: string
  name: string
  nameEn: string
}

const maps: MapData[] = [
  { id: 'ascent',    name: '亚海悬城', nameEn: 'Ascent' },
  { id: 'bind',      name: '源工重镇', nameEn: 'Bind' },
  { id: 'icebox',    name: '森寒冬港', nameEn: 'Icebox' },
  { id: 'split',     name: '霓虹町',   nameEn: 'Split' },
  { id: 'pearl',     name: '深海明珠', nameEn: 'Pearl' },
  { id: 'fracture',  name: '裂变峡谷', nameEn: 'Fracture' },
  { id: 'haven',     name: '隐世修所', nameEn: 'Haven' },
  { id: 'sunset',    name: '日落之城', nameEn: 'Sunset' },
  { id: 'lotus',     name: '莲华古城', nameEn: 'Lotus' },
  { id: 'breeze',    name: '微风岛屿', nameEn: 'Breeze' },
  { id: 'abyss',     name: '幽邃地窖', nameEn: 'Abyss' },
  { id: 'saltmine',  name: '盐海矿镇', nameEn: 'Salt Chuck Mine Town' },
  { id: 'summit',    name: '天枢云阙', nameEn: 'Summit' },
]

export default maps
