import { createContext, useContext, useReducer, useRef, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Marker, DrawPath, TextAnnotation, AgentPosition, AbilityShape, RecordedTrack, ToolMode } from '../types'
import { supabase } from '../lib/supabase'

export interface RemoteCursor {
  userId: string
  x: number
  y: number
  color: string
  lastSeen: number
}

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
  tracks: RecordedTrack[]
  currentTrackId: string | null
  recording: boolean
  recordingStartAt: number
  replaying: boolean
  replayIndex: number
  revealedShapeIds: string[]
  animatingShapeId: string | null  // 正在播放入场动画的形状ID
  // 阵容构建
  roster: { attack: string[]; defense: string[] }
  // 显示全部范围
  showAllRanges: boolean
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
      armScales: s.armScales ? [...s.armScales] : undefined,
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
  | { type: 'LOAD_ALL'; markers: Marker[]; drawings: DrawPath[]; texts: TextAnnotation[]; agents: AgentPosition[]; shapes: AbilityShape[]; name: string; desc: string; roster: { attack: string[]; defense: string[] }; tracks: RecordedTrack[] }
  | { type: 'APPLY_SNAPSHOT'; markers: Marker[]; drawings: DrawPath[]; texts: TextAnnotation[]; agents: AgentPosition[]; shapes: AbilityShape[]; roster: { attack: string[]; defense: string[] } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PLAY_START' }
  | { type: 'PLAY_STOP' }
  | { type: 'PLAY_STEP'; step: number }
  | { type: 'PLAY_SPEED'; speed: number }
  | { type: 'CREATE_TRACK'; name: string }
  | { type: 'DELETE_TRACK'; id: string }
  | { type: 'RENAME_TRACK'; id: string; name: string }
  | { type: 'ADD_TO_ROSTER'; team: 'attack' | 'defense'; agentId: string }
  | { type: 'REMOVE_FROM_ROSTER'; team: 'attack' | 'defense'; agentId: string }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_STOP' }
  | { type: 'REPLAY_START'; markers: Marker[] }
  | { type: 'REPLAY_STEP'; shapeId: string }
  | { type: 'HIDE_REPLAY_SHAPE'; shapeId: string }
  | { type: 'REPLAY_STOP' }
  | { type: 'TOGGLE_SHOW_ALL_RANGES' }

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
  tracks: [],
  currentTrackId: null,
  recording: false,
  recordingStartAt: 0,
  replaying: false,
  replayIndex: -1,
  revealedShapeIds: [],
  animatingShapeId: null,
  roster: { attack: [], defense: [] },
  showAllRanges: false,
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
    'CLEAR_ALL', 'LOAD_ALL', 'APPLY_SNAPSHOT', 'REPLAY_START', 'REPLAY_STOP', 'CREATE_TRACK', 'DELETE_TRACK'
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
      const shapeId = action.shape.id || genId('as')
      const newMarker = {
        id: genId('mk'),
        abilityId: action.shape.abilityId,
        agentId: action.shape.agentId,
        x: action.shape.x, y: action.shape.y,
        step: state.recording ? maxStep + 1 : maxStep + 1,
        time: state.recording ? Math.round((now - (state.recordingStartAt || now)) / 1000) : (maxStep + 1) * 5,
        note: '',
        createdAt: state.recording ? now : undefined,
        shapeId,
        trackId: state.currentTrackId || undefined,
      }
      return {
        state: {
          ...state,
          abilityShapes: [...state.abilityShapes, { ...action.shape, id: shapeId }],
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
      localStorage.removeItem('val-tactics-autosave')
      return { state: { ...initialState, toolMode: state.toolMode, drawColor: state.drawColor, drawWidth: state.drawWidth, side: state.side }, history: newHistory }
    case 'LOAD_ALL':
      return { state: { ...state, markers: action.markers, drawings: action.drawings, textAnnotations: action.texts, agentPositions: action.agents, abilityShapes: action.shapes, strategyName: action.name, strategyDescription: action.desc, selectedId: null, selectedType: null, roster: action.roster, tracks: action.tracks }, history: newHistory }
    case 'APPLY_SNAPSHOT':
      // 远程快照同步 — 替换整个画布状态（保留工具设置）
      return { state: { ...state, markers: action.markers, drawings: action.drawings, textAnnotations: action.texts, agentPositions: action.agents, abilityShapes: action.shapes, roster: action.roster, selectedId: null, selectedType: null }, history: newHistory }

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

    // 轨道管理
    case 'CREATE_TRACK':
      return { state: { ...state, tracks: [...state.tracks, { id: genId('tr'), name: action.name, createdAt: Date.now() }] }, history: newHistory }
    case 'DELETE_TRACK':
      return { state: { ...state, tracks: state.tracks.filter(t => t.id !== action.id), markers: state.markers.filter(m => m.trackId !== action.id) }, history: newHistory }
    case 'RENAME_TRACK':
      return { state: { ...state, tracks: state.tracks.map(t => t.id === action.id ? { ...t, name: action.name } : t) }, history: newHistory }

    // 阵容
    case 'ADD_TO_ROSTER': {
      const team = [...state.roster[action.team]]
      if (team.length >= 5) return { state, history: newHistory }
      if (team.includes(action.agentId)) return { state, history: newHistory }
      return { state: { ...state, roster: { ...state.roster, [action.team]: [...team, action.agentId] } }, history: newHistory }
    }
    case 'REMOVE_FROM_ROSTER':
      return { state: { ...state, roster: { ...state.roster, [action.team]: state.roster[action.team].filter(id => id !== action.agentId) } }, history: newHistory }

    // 录制
    case 'RECORDING_START': {
      const now = Date.now()
      const newTrack: RecordedTrack = { id: genId('tr'), name: `录制 ${state.tracks.length + 1}`, createdAt: now }
      return { state: { ...state, tracks: [...state.tracks, newTrack], currentTrackId: newTrack.id, recording: true, replaying: false, recordingStartAt: now }, history: newHistory }
    }
    case 'RECORDING_STOP':
      return { state: { ...state, recording: false }, history: newHistory }

    // 回放
    case 'REPLAY_START':
      return { state: { ...state, replaying: true, replayIndex: 0, recording: false, revealedShapeIds: [] }, history: newHistory }
    case 'REPLAY_STEP': {
      const revealed = [...state.revealedShapeIds, action.shapeId]
      return { state: { ...state, revealedShapeIds: revealed, animatingShapeId: action.shapeId, replayIndex: state.replayIndex + 1 }, history: newHistory }
    }
    case 'HIDE_REPLAY_SHAPE':
      return { state: { ...state, revealedShapeIds: state.revealedShapeIds.filter(id => id !== action.shapeId) }, history: newHistory }
    case 'REPLAY_STOP':
      return { state: { ...state, replaying: false, replayIndex: -1 }, history: newHistory }
    case 'TOGGLE_SHOW_ALL_RANGES':
      return { state: { ...state, showAllRanges: !state.showAllRanges }, history: newHistory }

    default:
      return { state, history: newHistory }
  }
}

// ====== Context ======
interface TacticsCtx extends TacticsState {
  dispatch: React.Dispatch<Action>
  history: History
  broadcastCursor: (x: number, y: number, userId: string) => void
  setCursorLayer: (el: HTMLDivElement | null) => void
  myUserId: string
  isRoomEditor: boolean
  roomEditorId: string | null
}

const TacticsContext = createContext<TacticsCtx | null>(null)

export function TacticsProvider({ children }: { children: ReactNode }) {
  const [{ state, history: hist }, rawDispatch] = useReducer(
    (prev: { state: TacticsState; history: History }, action: Action) => reducer(prev.state, action, prev.history),
    { state: initialState, history: { past: [], future: [] } }
  )
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const cursorElsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const cursorLayerRef = useRef<HTMLDivElement | null>(null)
  const myUserId = useRef('u' + Math.random().toString(36).slice(2, 8))
  const stateRef = useRef(state)
  stateRef.current = state // 保持 ref 始终指向最新 state

  // 注册光标层 DOM 引用
  const setCursorLayer = useCallback((el: HTMLDivElement | null) => {
    cursorLayerRef.current = el
  }, [])

  // 广播光标位置
  const broadcastCursor = useCallback((x: number, y: number, userId: string) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'cursor',
      payload: { x, y, userId, color: '#E349ED' },
    })
  }, [])

  // Realtime 订阅（用 state 追踪 roomId + editorId，确保变化时重连）
  const [activeRoomId, setActiveRoomId] = useState<string | null>(localStorage.getItem('room-id'))
  const [roomEditorId, setRoomEditorId] = useState<string | null>(localStorage.getItem('room-editor-id'))
  const isRoomEditor = !roomEditorId || roomEditorId === myUserId.current
  useEffect(() => {
    const check = () => {
      const id = localStorage.getItem('room-id')
      setActiveRoomId(prev => prev !== id ? id : prev)
      const eid = localStorage.getItem('room-editor-id')
      setRoomEditorId(prev => prev !== eid ? eid : prev)
    }
    check()
    window.addEventListener('storage', check)
    const t = setInterval(check, 2000)
    return () => { window.removeEventListener('storage', check); clearInterval(t) }
  }, [])

  const wantsSnapshotRef = useRef(false)

  useEffect(() => {
    const roomId = activeRoomId
    if (!roomId) {
      channelRef.current?.unsubscribe()
      channelRef.current = null
      wantsSnapshotRef.current = false
      return
    }
    // 加入房间时总是请求快照（覆盖本地残留状态）
    wantsSnapshotRef.current = true
    const ch = supabase.channel(`room:${roomId}`)
    ch.on('broadcast', { event: 'action' }, (payload: any) => {
      const action = payload.payload as Action
      if (!action.type) return
      (action as any)._remote = true
      rawDispatch(action)
    }).on('broadcast', { event: 'cursor' }, (payload: any) => {
      const { x, y, userId, color } = payload.payload
      const layer = cursorLayerRef.current
      if (!layer) return
      let el = cursorElsRef.current.get(userId)
      if (!el) {
        el = document.createElement('div')
        el.style.cssText = 'position:fixed;width:12px;height:12px;border-radius:50%;background:' + (color || '#05F8F8') + ';border:2px solid #fff;transform:translate(-50%,-50%);box-shadow:0 0 6px ' + (color || '#05F8F8') + ';transition:left .08s ease,top .08s ease;pointer-events:none;z-index:9999'
        const label = document.createElement('div')
        label.style.cssText = 'position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:9px;color:' + (color || '#05F8F8') + ';white-space:nowrap;background:rgba(0,0,0,.7);padding:1px 5px;border-radius:4px'
        label.textContent = userId.slice(0, 6)
        el.appendChild(label)
        layer.appendChild(el)
        cursorElsRef.current.set(userId, el)
      }
      el.style.left = x + 'px'
      el.style.top = y + 'px'
    }).on('broadcast', { event: 'request_snapshot' }, () => {
      // 收到快照请求 → 有状态则回复完整快照
      const cur = stateRef.current
      if (cur.markers.length > 0 || cur.drawings.length > 0 || cur.textAnnotations.length > 0 || cur.agentPositions.length > 0 || cur.abilityShapes.length > 0) {
        ch.send({
          type: 'broadcast', event: 'snapshot',
          payload: {
            markers: cur.markers, drawings: cur.drawings, texts: cur.textAnnotations,
            agents: cur.agentPositions, shapes: cur.abilityShapes, roster: cur.roster,
          }
        })
      }
    }).on('broadcast', { event: 'snapshot' }, (payload: any) => {
      // 收到快照 → 仅当等待中时应用（用 ref 防竞态）
      if (!wantsSnapshotRef.current) return
      const snap = payload.payload
      rawDispatch({ type: 'APPLY_SNAPSHOT', markers: snap.markers || [], drawings: snap.drawings || [], texts: snap.texts || [], agents: snap.agents || [], shapes: snap.shapes || [], roster: snap.roster || { attack: [], defense: [] }, _remote: true } as any)
      wantsSnapshotRef.current = false
    }).on('broadcast', { event: 'editor_change' }, (payload: any) => {
      const newEditorId = payload.payload?.editorId
      if (newEditorId) {
        localStorage.setItem('room-editor-id', newEditorId)
        setRoomEditorId(newEditorId)
      }
    }).on('broadcast', { event: 'room_close' }, () => {
      localStorage.removeItem('room-id')
      localStorage.removeItem('room-editor-id')
      setActiveRoomId(null)
      setRoomEditorId(null)
    }).subscribe()
    channelRef.current = ch
    // 加入房间后总是请求快照（覆盖本地残留状态）
    setTimeout(() => {
      ch.send({ type: 'broadcast', event: 'request_snapshot', payload: {} })
    }, 600)
    // 定期清理过期光标
    const t = setInterval(() => {
      for (const [uid, el] of cursorElsRef.current) {
        if (!document.body.contains(el)) { cursorElsRef.current.delete(uid); el.remove() }
      }
    }, 5000)
    return () => { ch.unsubscribe(); clearInterval(t) }
  }, [activeRoomId])

  const pendingAction = useRef<any>(null)
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 非编辑者的修改操作列表
  const editActions = new Set([
    'ADD_MARKER','UPDATE_MARKER','REMOVE_MARKER',
    'ADD_DRAWING','UPDATE_DRAWING','REMOVE_DRAWING',
    'ADD_TEXT','UPDATE_TEXT','REMOVE_TEXT',
    'ADD_AGENT_POS','UPDATE_AGENT_POS','REMOVE_AGENT_POS',
    'ADD_ABILITY_SHAPE','UPDATE_ABILITY_SHAPE','REMOVE_ABILITY_SHAPE',
    'CLEAR_ALL','LOAD_ALL','UNDO','REDO',
    'ADD_TO_ROSTER','REMOVE_FROM_ROSTER',
  ])

  // 包装 dispatch：UPDATE类操作debounce广播，非编辑者封锁修改
  const dispatch = (action: Action) => {
    // 非编辑者封锁修改操作（远程操作除外）
    const isRemote = !!(action as any)._remote
    if (!isRemote && roomEditorId && roomEditorId !== myUserId.current) {
      if (editActions.has(action.type)) return // 静默忽略
    }
    rawDispatch(action)
    const roomId = localStorage.getItem('room-id')
    // CLEAR_ALL/LOAD_ALL 不广播（会清空队友画面）
    if (!roomId || isRemote || !channelRef.current) return
    if (action.type === 'CLEAR_ALL' || action.type === 'LOAD_ALL' || action.type === 'APPLY_SNAPSHOT') return

    // ADD/DELETE 立即发送，UPDATE debounce 100ms
    if (action.type.startsWith('UPDATE_')) {
      pendingAction.current = action
      if (sendTimer.current) return
      sendTimer.current = setTimeout(() => {
        sendTimer.current = null
        if (pendingAction.current) {
          channelRef.current!.send({
            type: 'broadcast', event: 'action',
            payload: JSON.parse(JSON.stringify(pendingAction.current)),
          })
          pendingAction.current = null
        }
      }, 100)
    } else {
      channelRef.current.send({
        type: 'broadcast', event: 'action',
        payload: JSON.parse(JSON.stringify(action)),
      })
    }
  }

  return (
    <TacticsContext.Provider value={{ ...state, dispatch, history: hist, broadcastCursor, setCursorLayer, myUserId: myUserId.current, isRoomEditor, roomEditorId }}>
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
