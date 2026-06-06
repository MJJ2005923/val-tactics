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
  phase?: string  // 回合阶段: 站位/默认/执行/残局等
  createdAt?: number  // 录制时间戳
  shapeId?: string  // 关联的技能形状ID
  trackId?: string  // 所属录制轨道ID
  duration?: number  // 技能持续时间(秒)，回放时到期自动隐藏
}

// 录制轨道
export interface RecordedTrack {
  id: string
  name: string
  createdAt: number
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

// ====== 技能形状配置（每个技能的外观定义） ======
export interface AbilityShapeConfig {
  shape: 'circle' | 'cone' | 'rect' | 'line'
  radius?: number       // 圆形半径 0-1
  outerRadius?: number  // 外层圆形半径 0-1（如奇乐Q双圈）
  angle?: number        // 锥形角度（度）
  length?: number       // 锥形边长 / 矩形长 / 直线长
  width?: number        // 矩形高
  thickness?: number    // 线宽
  iconOnly?: boolean    // 仅显示图标，不渲染形状范围
}

// ====== 放置在地图上的技能形状实例 ======
export interface AbilityShape {
  id: string
  abilityId: string
  agentId: string
  x: number; y: number           // 中心点 0-1
  rotation: number               // 旋转角度（度, 0=上）
  shape: 'circle' | 'cone' | 'rect' | 'line'
  radius: number                 // 圆半径
  outerRadius?: number           // 外层圆形半径
  angle: number                  // 锥形角度
  length: number                 // 锥形边长 / 矩形长 / 直线长
  width: number                  // 矩形高
  thickness: number              // 线宽
  iconOnly?: boolean             // 仅显示图标
  path?: { x: number; y: number }[]  // 自由绘制路径（如 harbor-cascade 弯曲水墙）
  armScales?: number[]           // 钢锁C四臂独立长度比例 [上,右,下,左] 默认[1,1,1,1]
}

// ====== 工具模式 ======
export type ToolMode = 'select' | 'freehand' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'agent' | 'eraser'

// ====== 撤销重做快照 ======
export interface Snapshot {
  markers: Marker[]
  drawings: DrawPath[]
  textAnnotations: TextAnnotation[]
  agentPositions: AgentPosition[]
  abilityShapes: AbilityShape[]
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
  abilityShapes: AbilityShape[]
  roster: { attack: string[]; defense: string[] }
  tracks: RecordedTrack[]
}
