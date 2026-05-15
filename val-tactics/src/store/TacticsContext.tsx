import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Marker } from '../types'

interface TacticsState {
  markers: Marker[]
  selectedId: string | null
}

interface TacticsActions {
  addMarker: (m: Marker) => void
  updateMarker: (id: string, updates: Partial<Marker>) => void
  removeMarker: (id: string) => void
  selectMarker: (id: string | null) => void
  clearMarkers: () => void
  loadMarkers: (markers: Marker[]) => void
}

const TacticsContext = createContext<(TacticsState & TacticsActions) | null>(null)

let idCounter = 0
function genId() {
  return 'm_' + Date.now() + '_' + (++idCounter)
}

export function TacticsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TacticsState>({ markers: [], selectedId: null })

  const addMarker = useCallback((m: Marker) => {
    setState(prev => ({
      ...prev,
      markers: [...prev.markers, { ...m, id: m.id || genId() }]
    }))
  }, [])

  const updateMarker = useCallback((id: string, updates: Partial<Marker>) => {
    setState(prev => ({
      ...prev,
      markers: prev.markers.map(m => m.id === id ? { ...m, ...updates } : m)
    }))
  }, [])

  const removeMarker = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      markers: prev.markers.filter(m => m.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId
    }))
  }, [])

  const selectMarker = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedId: id }))
  }, [])

  const clearMarkers = useCallback(() => {
    setState(prev => ({ ...prev, markers: [], selectedId: null }))
  }, [])

  const loadMarkers = useCallback((markers: Marker[]) => {
    setState(prev => ({ ...prev, markers, selectedId: null }))
  }, [])

  return (
    <TacticsContext.Provider value={{ ...state, addMarker, updateMarker, removeMarker, selectMarker, clearMarkers, loadMarkers }}>
      {children}
    </TacticsContext.Provider>
  )
}

export function useTactics() {
  const ctx = useContext(TacticsContext)
  if (!ctx) throw new Error('useTactics must be used within TacticsProvider')
  return ctx
}
