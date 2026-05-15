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

export interface Template {
  id: string
  name: string
  mapId: string
  createdAt: number
  updatedAt: number
  markers: Marker[]
}
