import Dexie, { type EntityTable } from 'dexie'
import type { Template } from '../types'

const db = new Dexie('val-tactics-db') as Dexie & {
  templates: EntityTable<Template, 'id'>
}

db.version(1).stores({
  templates: 'id, name, mapId, updatedAt'
})

export { db }
export type { Template }
