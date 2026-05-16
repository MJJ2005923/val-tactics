// ====== 技能标记 ======
export interface Marker {
  id: string
  abilityId: string
  agentId: string
  x: number
  y: number
  step: number
  time: number
  note: string
}

// ====== 绘图路径 ======
export type DrawType = 'freehand' | 'line' | 'arrow' | 'rect' | 'circle'

export interface DrawPath {
  id: string
  type: DrawType
  points: { x: number; y: number }[]  // 标准化坐标 0-1（freehand 为轨迹点，line/arrow 为 [start,end]）
  color: string
  width: number
  // rect 专用
  x?: number; y?: number; w?: number; h?: number
  // circle 专用
  cx?: number; cy?: number; r?: number
}

// ====== 文字标注 ======
export interface TextAnnotation {
  id: string
  x: number; y: number    // 标准化坐标 0-1
  text: string
  color: string
  fontSize: number
}

// ====== 特工位置标记 ======
export interface AgentPosition {
  id: string
  agentId: string
  x: number; y: number    // 标准化坐标 0-1
  team: 'attack' | 'defense'
}

// ====== 工具模式 ======
export type ToolMode = 'select' | 'freehand' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'agent' | 'eraser'

// ====== 撤销重做快照 ======
export interface Snapshot {
  markers: Marker[]
  drawings: DrawPath[]
  textAnnotations: TextAnnotation[]
  agentPositions: AgentPosition[]
}

// ====== 战术模板 ======
export interface Template {
  id: string
  name: string
  description: string
  mapId: string
  createdAt: number
  updatedAt: number
  markers: Marker[]
  drawings: DrawPath[]
  textAnnotations: TextAnnotation[]
  agentPositions: AgentPosition[]
}
