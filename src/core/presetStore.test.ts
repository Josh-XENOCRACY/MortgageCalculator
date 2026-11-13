import { describe, expect, it, beforeEach } from 'vitest'
import type { MortgageConfig } from './types'
import {
  type SavedPreset,
  MAX_USER_PRESETS,
  clearPresets,
  getSnapshot,
  removePreset,
  savePreset,
} from './presetStore'

const cfg = (n = 500_000): MortgageConfig => ({
  loanAmount: n,
  termMonths: 300,
  rateSchedule: [{ startMonth: 0, annualRatePct: 5 }],
  overpaymentBlocks: [],
  oneOffs: [],
  overpaymentMode: 'reduce_term',
})

describe('presetStore', () => {
  beforeEach(() => {
    clearPresets()
    try {
      localStorage.removeItem('mortgage-app.user-presets.v1')
    } catch {
      // no localStorage in this environment
    }
  })

  it('saves a preset and persists it to localStorage', () => {
    savePreset('a1', 'My deal', cfg(750_000))
    expect(getSnapshot()).toHaveLength(1)
    expect(getSnapshot()[0]?.name).toBe('My deal')
    expect(getSnapshot()[0]?.config.loanAmount).toBe(750_000)

    const raw = localStorage.getItem('mortgage-app.user-presets.v1')
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw as string) as SavedPreset[]
    expect(stored).toHaveLength(1)
    expect(stored[0]?.name).toBe('My deal')
  })

  it('stores a copy, not a reference to the caller config', () => {
    const source = cfg(600_000)
    savePreset('a1', 'Frozen', source)
    source.loanAmount = 999_999
    expect(getSnapshot()[0]?.config.loanAmount).toBe(600_000)
  })

  it('trims and rejects blank names', () => {
    expect(() => savePreset('x', '   ', cfg())).toThrow(TypeError)
    savePreset('a1', '  Trimmed  ', cfg())
    expect(getSnapshot()[0]?.name).toBe('Trimmed')
  })

  it('rejects duplicate names', () => {
    savePreset('a1', 'First', cfg(100))
    expect(getSnapshot()).toHaveLength(1)
    expect(() => savePreset('b1', 'First', cfg(200))).toThrow(RangeError)
    expect(getSnapshot()).toHaveLength(1)
  })

  it('removes a preset and updates storage', () => {
    savePreset('a1', 'Keep', cfg(111))
    savePreset('b1', 'Drop', cfg(222))
    removePreset('b1')
    expect(getSnapshot()).toHaveLength(1)
    expect(getSnapshot()[0]?.name).toBe('Keep')
    const stored = JSON.parse(localStorage.getItem('mortgage-app.user-presets.v1') as string)
    expect(stored).toHaveLength(1)
  })

  it('enforces the preset cap', () => {
    for (let i = 0; i < MAX_USER_PRESETS; i++) {
      savePreset(`id${i}`, `Preset ${i}`, cfg(i))
    }
    expect(() => savePreset('idMax', 'One too many', cfg())).toThrow(Error)
    expect(getSnapshot()).toHaveLength(MAX_USER_PRESETS)
  })

  it('keeps snapshots referentially stable until a change (useSyncExternalStore contract)', () => {
    const s1 = getSnapshot()
    expect(getSnapshot()).toBe(s1)
    savePreset('a1', 'Changed', cfg())
    expect(getSnapshot()).not.toBe(s1)
  })
})
