import { describe, expect, it } from 'vitest'
import { normalizeIds } from './eventIds'
import type { MortgageConfig } from './types'

const base: Omit<MortgageConfig, 'overpaymentBlocks' | 'oneOffs'> = {
  loanAmount: 100_000,
  termMonths: 120,
  rateSchedule: [{ startMonth: 0, annualRatePct: 5 }],
  overpaymentMode: 'reduce_term',
}

describe('normalizeIds', () => {
  it('assigns a unique id to every event that lacks one', () => {
    const cfg: MortgageConfig = {
      ...base,
      overpaymentBlocks: [
        { startMonth: 0, endMonth: 11, amount: 100 },
        { startMonth: 12, endMonth: 23, amount: 200 },
      ],
      oneOffs: [{ month: 30, amount: 500 }],
    }
    const out = normalizeIds(cfg)
    const ids = [...out.overpaymentBlocks.map((b) => b.id), ...out.oneOffs.map((o) => o.id)]
    expect(ids.every((i) => typeof i === 'string' && i.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(3)
  })

  it('keeps existing ids unchanged (idempotent)', () => {
    const cfg: MortgageConfig = {
      ...base,
      overpaymentBlocks: [{ id: 'keep-me', startMonth: 0, endMonth: 11, amount: 100 }],
      oneOffs: [{ month: 30, amount: 500 }],
    }
    const once = normalizeIds(cfg)
    expect(once.overpaymentBlocks[0]?.id).toBe('keep-me')
    const twice = normalizeIds(once)
    expect(twice.overpaymentBlocks[0]?.id).toBe('keep-me')
    expect(twice.oneOffs[0]?.id).toBe(once.oneOffs[0]?.id)
  })

  it('does not mutate the input', () => {
    const cfg: MortgageConfig = {
      ...base,
      overpaymentBlocks: [{ startMonth: 0, endMonth: 11, amount: 100 }],
      oneOffs: [],
    }
    normalizeIds(cfg)
    expect(cfg.overpaymentBlocks[0]?.id).toBeUndefined()
  })
})
