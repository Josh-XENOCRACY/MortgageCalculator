import { describe, expect, it } from 'vitest'
import { impactOfEvent } from './eventImpact'
import type { MortgageConfig } from './types'

const base: MortgageConfig = {
  loanAmount: 250_000,
  termMonths: 360,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
  overpaymentBlocks: [],
  oneOffs: [],
  overpaymentMode: 'reduce_term',
}

describe('impactOfEvent', () => {
  it('a one-off lump strictly reduces term and interest', () => {
    const cfg: MortgageConfig = {
      ...base,
      oneOffs: [{ month: 60, amount: 50_000 }],
    }
    const d = impactOfEvent(cfg, (c) => ({
      ...c,
      oneOffs: c.oneOffs.filter((o) => o.month !== 60),
    }))
    expect(d.monthsSaved).toBeGreaterThan(0)
    expect(d.interestSaved).toBeGreaterThan(0)
  })

  it('a regular overpayment strictly reduces term and interest', () => {
    const cfg: MortgageConfig = {
      ...base,
      overpaymentBlocks: [{ startMonth: 0, endMonth: 59, amount: 300 }],
    }
    const d = impactOfEvent(cfg, (c) => ({
      ...c,
      overpaymentBlocks: c.overpaymentBlocks.filter((b) => b.startMonth !== 0),
    }))
    expect(d.monthsSaved).toBeGreaterThan(0)
    expect(d.interestSaved).toBeGreaterThan(0)
  })

  it('removing an event that is not present reports a neutral delta', () => {
    const neutral = impactOfEvent(base, (c) => ({
      ...c,
      oneOffs: c.oneOffs.filter((o) => o.month !== 999),
    }))
    expect(neutral.monthsSaved).toBe(0)
    expect(neutral.interestSaved).toBe(0)
  })
})
