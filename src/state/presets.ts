import { useCallback, useSyncExternalStore } from 'react'
import type { MortgageConfig } from '@/core/types'
import {
  type SavedPreset,
  getSnapshot,
  removePreset,
  savePreset,
  subscribeToPresets,
} from '@/core/presetStore'

export function useSavedPresets(): SavedPreset[] {
  return useSyncExternalStore(subscribeToPresets, getSnapshot)
}

/**
 * Stable save/remove actions for the saved-preset list. `save` returns the id
 * of the row that was persisted, after the store has been updated, and
 * rethrows validation errors (blank name, duplicate name, cap) for the caller
 * to surface.
 */
export function useSavedPresetActions() {
  const save = useCallback((name: string, config: MortgageConfig): string => {
    const id = globalThis.crypto?.randomUUID() ?? `u${Date.now().toString(36)}`
    savePreset(id, name, config)
    return id
  }, [])
  const remove = useCallback((id: string) => removePreset(id), [])
  return { save, remove }
}
