import type { MortgageConfig } from './types'
import { validateConfig } from './validate'

export interface SavedPreset {
  id: string
  name: string
  config: MortgageConfig
}

/** Hard cap so a buggy/abusive UI can't bloat the quota (or the list). */
export const MAX_USER_PRESETS = 50

const STORAGE_KEY = 'mortgage-app.user-presets.v1'

/**
 * Guarded localStorage access: some runtimes (jsdom in this environment)
 * define `localStorage` without the Storage methods, so check each method
 * exists before calling it and fall back to a no-op / null on failure.
 */
interface StorageMethods {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
}

function storage(): StorageMethods | null {
  const s = (globalThis as { localStorage?: unknown }).localStorage
  if (
    s != null &&
    typeof (s as StorageMethods).getItem === 'function' &&
    typeof (s as StorageMethods).setItem === 'function' &&
    typeof (s as StorageMethods).removeItem === 'function'
  ) {
    return s as StorageMethods
  }
  return null
}

let presets: SavedPreset[] = readStorage()
const subscribers = new Set<() => void>()

function readStorage(): SavedPreset[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY) ?? null
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: SavedPreset[] = []
    for (const p of parsed as unknown[]) {
      if (typeof p !== 'object' || p === null) continue
      const row = p as Record<string, unknown>
      if (typeof row.id !== 'string' || row.id === '') continue
      if (typeof row.name !== 'string' || row.name.trim() === '') continue
      const config = validateConfig(row.config)
      if (config === null) continue
      out.push({ id: row.id, name: row.name, config })
    }
    return out
  } catch {
    return []
  }
}

function writeStorage(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // storage unavailable (private mode, quota) — in-memory copies still work
  }
}

let snapshotCache: SavedPreset[] | null = null
/** Stable while `presets` is unchanged (getSnapshot must not thrash on no-op updates). */
export function getSnapshot(): SavedPreset[] {
  if (snapshotCache === null) snapshotCache = presets
  return snapshotCache
}

export function subscribeToPresets(fn: () => void): () => void {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

function emit(): void {
  snapshotCache = null
  for (const fn of subscribers) fn()
}

/**
 * Persist one preset as a copy of `config`. Throws `TypeError` on a blank
 * name, `Error` when too many presets already exist, and `RangeError` on a
 * colliding name.
 */
export function savePreset(id: string, name: string, config: MortgageConfig): void {
  const trimmed = name.trim()
  if (trimmed === '') throw new TypeError('A preset needs a name')
  if (validateConfig(config) === null) throw new TypeError('Not a valid mortgage plan')
  if (presets.some((p) => p.name === trimmed)) {
    throw new RangeError(`A preset is already saved as "${trimmed}"`)
  }
  if (presets.length >= MAX_USER_PRESETS) {
    throw new Error(`You can save at most ${MAX_USER_PRESETS} presets`)
  }
  presets = [...presets, { id, name: trimmed, config: structuredClone(config) }]
  writeStorage()
  emit()
}

export function removePreset(id: string): void {
  presets = presets.filter((p) => p.id !== id)
  writeStorage()
  emit()
}

/** Test-only: drop all in-memory presets and their storage. */
export function clearPresets(): void {
  presets = []
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // no storage available
  }
  emit()
}
