import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Marker, DrawPath, TextAnnotation, AgentPosition, AbilityShape, ToolMode } from '../types'

// ====== 完整状态 ======
export interface TacticsState {
  markers: Marker[]
  drawings: DrawPath[]
  textAnnotations: TextAnnotation[]
  agentPositions: AgentPosition[]
  abilityShapes: AbilityShape[]
  selectedId: string | null        // 选中的对象 ID
  selectedType: 'marker' | 'drawing' | 'text' | 'agent' | 'abilityShape' | null
  toolMode: ToolMode
  side: 'attack' | 'defense'
  drawColor: string
  drawWidth: number
  fontSize: number
  // 动画播放
  playing: boolean
  playSpeed: number                // 0.5, 1, 2
  playStep: number                 // 当前播放步骤 (-1 = 停止)
  // 策略元信息
  strategyName: string
  strategyDescription: string
  // 录制与回放
  recording: boolean
  replaying: boolean
  replayIndex: number
}

// ====== 快照（用于撤销重做） ======
interface Snapshot {
  markers: Marker[]
  drawings: DrawPath[]
  textAnnotations: TextAnnotation[]
  agentPositions: AgentPosition[]
  abilityShapes: AbilityShape[]
}

interface History {
  past: Snapshot[]
  future: Snapshot[]
}

const MAX_HISTORY = 50

function takeSnapshot(state: TacticsState): Snapshot {
  return {
    markers: state.markers.map(m => ({ ...m })),
    drawings: state.drawings.map(d => ({ ...d, points: d.points.map(p => ({ ...p })) })),
    textAnnotations: state.textAnnotations.map(t => ({ ...t })),
    agentPositions: state.agentPositions.map(a => ({ ...a })),
    abilityShapes: state.abilityShapes.map(s => ({
      ...s,
      path: s.path ? s.path.map(p => ({ ...p })) : undefined,
    })),
  }
}

// ====== Actions ======
type Action =
  | { type: 'SET_TOOL_MODE'; mode: ToolMode }
  | { type: 'SET_DRAW_COLOR'; color: string }
  | { type: 'SET_DRAW_WIDTH'; width: number }
  | { type: 'SET_FONT_SIZE'; size: number }
  | { type: 'SET_SIDE'; side: 'attack' | 'defense' }
  | { type: 'SET_STRATEGY_NAME'; name: string }
  | { type: 'SET_STRATEGY_DESCRIPTION'; desc: string }
  | { type: 'ADD_MARKER'; marker: Marker }
  | { type: 'UPDATE_MARKER'; id: string; updates: Partial<Marker> }
  | { type: 'REMOVE_MARKER'; id: string }
  | { type: 'ADD_DRAWING'; drawing: DrawPath }
  | { type: 'UPDATE_DRAWING'; id: string; updates: Partial<DrawPath> }
  | { type: 'REMOVE_DRAWING'; id: string }
  | { type: 'ADD_TEXT'; text: TextAnnotation }
  | { type: 'UPDATE_TEXT'; id: string; updates: Partial<TextAnnotation> }
  | { type: 'REMOVE_TEXT'; id: string }
  | { type: 'ADD_AGENT_POS'; pos: AgentPosition }
  | { type: 'UPDATE_AGENT_POS'; id: string; updates: Partial<AgentPosition> }
  | { type: 'REMOVE_AGENT_POS'; id: string }
  | { type: 'ADD_ABILITY_SHAPE'; shape: AbilityShape }
  | { type: 'UPDATE_ABILITY_SHAPE'; id: string; updates: Partial<AbilityShape> }
  | { type: 'REMOVE_ABILITY_SHAPE'; id: string }
  | { type: 'SELECT'; id: string | null; selType: TacticsState['selectedType'] }
  | { type: 'CLEAR_ALL' }
  | { type: 'LOAD_ALL'; markers: Marker[]; drawings: DrawPath[]; texts: TextAnnotation[]; agents: AgentPosition[]; shapes: AbilityShape[]; name: string; desc: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PLAY_START' }
  | { type: 'PLAY_STOP' }
  | { type: 'PLAY_STEP'; step: number }
  | { type: 'PLAY_SPEED'; speed: number }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_STOP' }
  | { type: 'REPLAY_START'; markers: Marker[] }
  | { type: 'REPLAY_STEP'; index: number }
  | { type: 'REPLAY_STOP' }

// ====== 初始状态 ======
const initialState: TacticsState = {
  markers: [],
  drawings: [],
  textAnnotations: [],
  agentPositions: [],
  abilityShapes: [],
  selectedId: null,
  selectedType: null,
  toolMode: 'select',
  side: 'attack',
  drawColor: '#ff4655',
  drawWidth: 3,
  fontSize: 24,
  playing: false,
  playSpeed: 1,
  playStep: -1,
  strategyName: '',
  strategyDescription: '',
  recording: false,
  replaying: false,
  replayIndex: -1,
}

let idCounter = 0
export function genId(prefix = 'm') {
  return prefix + '_' + Date.now() + '_' + (++idCounter)
}

// ====== Reducer ======
function reducer(state: TacticsState, action: Action, history: History): { state: TacticsState; history: History } {
  // 需要记录快照的操作类型
  const snapshotActions = new Set([
    'ADD_MARKER', 'UPDATE_MARKER', 'REMOVE_MARKER',
    'ADD_DRAWING', 'UPDATE_DRAWING', 'REMOVE_DRAWING',
    'ADD_TEXT', 'UPDATE_TEXT', 'REMOVE_TEXT',
    'ADD_AGENT_POS', 'UPDATE_AGENT_POS', 'REMOVE_AGENT_POS',
    'ADD_ABILITY_SHAPE', 'UPDATE_ABILITY_SHAPE', 'REMOVE_ABILITY_SHAPE',
    'CLEAR_ALL', 'LOAD_ALL', 'REPLAY_START', 'REPLAY_STOP'
  ])

  let newHistory = { ...history }

  // 需要快照的操作
  if (snapshotActions.has(action.type) && action.type !== 'UNDO' && action.type !== 'REDO') {
    newHistory = {
      past: [...newHistory.past, takeSnapshot(state)].slice(-MAX_HISTORY),
      future: []
    }
  }

  switch (action.type) {
    case 'SET_TOOL_MODE':
      return { state: { ...state, toolMode: action.mode, selectedId: null, selectedType: null }, history: newHistory }
    case 'SET_DRAW_COLOR':
      return { state: { ...state, drawColor: action.color }, history: newHistory }
    case 'SET_DRAW_WIDTH':
      return { state: { ...state, drawWidth: action.width }, history: newHistory }
    case 'SET_FONT_SIZE':
      return { state: { ...state, fontSize: action.size }, history: newHistory }
    case 'SET_SIDE':
      return { state: { ...state, side: action.side }, history: newHistory }
    case 'SET_STRATEGY_NAME':
      return { state: { ...state, strategyName: action.name }, history: newHistory }
    case 'SET_STRATEGY_DESCRIPTION':
      return { state: { ...state, strategyDescription: action.desc }, history: newHistory }

    // Markers
    case 'ADD_MARKER':
      return { state: { ...state, markers: [...state.markers, { ...action.marker, id: action.marker.id || genId('mk') }] }, history: newHistory }
    case 'UPDATE_MARKER':
      return { state: { ...state, markers: state.markers.map(m => m.id === action.id ? { ...m, ...action.updates } : m) }, history: newHistory }
    case 'REMOVE_MARKER':
      return { state: { ...state, markers: state.markers.filter(m => m.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId, selectedType: state.selectedId === action.id ? null : state.selectedType }, history: newHistory }

    // Drawings
    case 'ADD_DRAWING':
      return { state: { ...state, drawings: [...state.drawings, { ...action.drawing, id: action.drawing.id || genId('dr') }] }, history: newHistory }
    case 'UPDATE_DRAWING':
      return { state: { ...state, drawings: state.drawings.map(d => d.id === action.id ? { ...d, ...action.updates } : d) }, history: newHistory }
    case 'REMOVE_DRAWING':
      return { state: { ...state, drawings: state.drawings.filter(d => d.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId, selectedType: state.selectedId === action.id ? null : state.selectedType }, history: newHistory }

    // Text annotations
    case 'ADD_TEXT':
      return { state: { ...state, textAnnotations: [...state.textAnnotations, { ...action.text, id: action.text.id || genId('tx') }] }, history: newHistory }
    case 'UPDATE_TEXT':
      return { state: { ...state, textAnnotations: state.textAnnotations.map(t => t.id === action.id ? { ...t, ...action.updates } : t) }, history: newHistory }
    case 'REMOVE_TEXT':
      return { state: { ...state, textAnnotations: state.textAnnotations.filter(t => t.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId, selectedType: state.selectedId === action.id ? null : state.selectedType }, history: newHistory }

    // Agent positions
    case 'ADD_AGENT_POS':
      return { state: { ...state, agentPositions: [...state.agentPositions, { ...action.pos, id: action.pos.id || genId('ap') }] }, history: newHistory }
    case 'UPDATE_AGENT_POS':
      return { state: { ...state, agentPositions: state.agentPositions.map(a => a.id === action.id ? { ...a, ...action.updates } : a) }, history: newHistory }
    case 'REMOVE_AGENT_POS':
      return { state: { ...state, agentPositions: state.agentPositions.filter(a => a.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId, selectedType: state.selectedId === action.id ? null : state.selectedType }, history: newHistory }

    // Ability shapes — 同时自动创建时间轴标记
    case 'ADD_ABILITY_SHAPE': {
      const maxStep = state.markers.reduce((max, m) => Math.max(max, m.step), 0)
      const now = Date.now()
      const newMarker = {
        id: genId('mk'),
        abilityId: action.shape.abilityId,
        agentId: action.shape.agentId,
        x: action.shape.x, y: action.shape.y,
        step: state.recording ? maxStep + 1 : maxStep + 1,
        time: state.recording ? Math.round((now - (state.markers[0]?.createdAt ?? now)) / 1000) : (maxStep + 1) * 5,
        note: '',
        createdAt: state.recording ? now : undefined,
      }
      return {
        state: {
          ...state,
          abilityShapes: [...state.abilityShapes, { ...action.shape, id: action.shape.id || genId('as') }],
          markers: [...state.markers, newMarker],
        },
        history: newHistory,
      }
    }
    case 'UPDATE_ABILITY_SHAPE':
      return { state: { ...state, abilityShapes: state.abilityShapes.map(s => s.id === action.id ? { ...s, ...action.updates } : s) }, history: newHistory }
    case 'REMOVE_ABILITY_SHAPE':
      return { state: { ...state, abilityShapes: state.abilityShapes.filter(s => s.id !== action.id), selectedId: state.selectedId === action.id ? null : state.selectedId, selectedType: state.selectedId === action.id ? null : state.selectedType }, history: newHistory }

    // Selection
    case 'SELECT':
      return { state: { ...state, selectedId: action.id, selectedType: action.selType }, history: newHistory }

    // Clear / Load
    case 'CLEAR_ALL':
      return { state: { ...initialState, toolMode: state.toolMode, drawColor: state.drawColor, drawWidth: state.drawWidth, side: state.side }, history: newHistory }
    case 'LOAD_ALL':
      return { state: { ...state, markers: action.markers, drawings: action.drawings, textAnnotations: action.texts, agentPositions: action.agents, abilityShapes: action.shapes, strategyName: action.name, strategyDescription: action.desc, selectedId: null, selectedType: null }, history: newHistory }

    // Undo / Redo
    case 'UNDO': {
      if (newHistory.past.length === 0) return { state, history: newHistory }
      const prev = newHistory.past[newHistory.past.length - 1]
      const s = takeSnapshot(state)
      return {
        state: { ...state, markers: prev.markers, drawings: prev.drawings, textAnnotations: prev.textAnnotations, agentPositions: prev.agentPositions, abilityShapes: prev.abilityShapes, selectedId: null, selectedType: null },
        history: { past: newHistory.past.slice(0, -1), future: [s, ...newHistory.future].slice(0, MAX_HISTORY) }
      }
    }
    case 'REDO': {
      if (newHistory.future.length === 0) return { state, history: newHistory }
      const next = newHistory.future[0]
      const s = takeSnapshot(state)
      return {
        state: { ...state, markers: next.markers, drawings: next.drawings, textAnnotations: next.textAnnotations, agentPositions: next.agentPositions, abilityShapes: next.abilityShapes, selectedId: null, selectedType: null },
        history: { past: [...newHistory.past, s].slice(-MAX_HISTORY), future: newHistory.future.slice(1) }
      }
    }

    // Playback
    case 'PLAY_START':
      return { state: { ...state, playing: true, playStep: 0 }, history: newHistory }
    case 'PLAY_STOP':
      return { state: { ...state, playing: false, playStep: -1 }, history: newHistory }
    case 'PLAY_STEP':
      return { state: { ...state, playStep: action.step }, history: newHistory }
    case 'PLAY_SPEED':
      return { state: { ...state, playSpeed: action.speed }, history: newHistory }

    // 录制
    case 'RECORDING_START':
      return { state: { ...state, recording: true, replaying: false }, history: newHistory }
    case 'RECORDING_STOP':
      return { state: { ...state, recording: false }, history: newHistory }

    // 回放
    case 'REPLAY_START':
      return { state: { ...state, replaying: true, replayIndex: 0, recording: false }, history: newHistory }
    case 'REPLAY_STEP':
      return { state: { ...state, replayIndex: action.index }, history: newHistory }
    case 'REPLAY_STOP':
      return { state: { ...state, replaying: false, replayIndex: -1 }, history: newHistory }

    default:
      return { state, history: newHistory }
  }
}

// ====== Context ======
interface TacticsCtx extends TacticsState {
  dispatch: React.Dispatch<Action>
  history: History
}

const TacticsContext = createContext<TacticsCtx | null>(null)

export function TacticsProvider({ children }: { children: ReactNode }) {
  const [{ state, history: hist }, dispatch] = useReducer(
    (prev: { state: TacticsState; history: History }, action: Action) => reducer(prev.state, action, prev.history),
    { state: initialState, history: { past: [], future: [] } }
  )

  return (
    <TacticsContext.Provider value={{ ...state, dispatch, history: hist }}>
      {children}
    </TacticsContext.Provider>
  )
}

export function useTactics() {
  const ctx = useContext(TacticsContext)
  if (!ctx) throw new Error('useTactics must be used within TacticsProvider')
  return ctx
}

// ====== 便捷 hooks ======
export function useTacticsDispatch() {
  return useTactics().dispatch
}
