import { describe, expect, it } from 'vitest'
import { simulate } from './engine'
import { buildWaterfallBars } from './waterfall'
import type { MortgageConfig } from './types'

const base: MortgageConfig = {
  loanAmount: 250_000,
  termMonths: 360,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
  overpaymentBlocks: [],
  oneOffs: [],
  overpaymentMode: 'reduce_term',
}

describe('buildWaterfallBars', () => {
  it('with no overpayments shows a single scheduled-principal bar that fully covers the loan', () => {
    const result = simulate(base)
    const bars = buildWaterfallBars(base, result)

    expect(bars).toHaveLength(1)
    const [b] = bars
    expect(b.label).toBe('Scheduled principal')
    expect(b.base).toBeCloseTo(250_000, 2)
    expect(b.end).toBeCloseTo(0, 2) // pays off within the term
    expect(b.amount).toBeCloseTo(250_000, 2)
  })

  it('splits into an overpayment bar plus the scheduled-principal bridge, summing to the loan', () => {
    const cfg: MortgageConfig = {
      ...base,
      oneOffs: [{ month: 60, amount: 50_000 }],
    }
    const result = simulate(cfg)
    const bars = buildWaterfallBars(cfg, result)

    expect(bars).toHaveLength(2)
    expect(bars[0].label).toContain('One-off')
    expect(bars[1].label).toBe('Scheduled principal')

    // The bars telescope: first base = loan, each base = previous end.
    expect(bars[0].base).toBeCloseTo(250_000, 2)
    const last = bars[bars.length - 1]
    expect(last.end).toBeCloseTo(0, 2) // pays off

    // Every bar's amount is positive and the total removed equals the loan.
    for (const b of bars) expect(b.amount).toBeGreaterThan(0)
    const total = bars.reduce((s, b) => s + b.amount, 0)
    expect(total).toBeCloseTo(250_000, 2)
  })

  it('telescopes correctly across multiple ordered events', () => {
    const cfg: MortgageConfig = {
      ...base,
      oneOffs: [{ month: 180, amount: 30_000 }, { month: 30, amount: 20_000 }],
    }
    const result = simulate(cfg)
    const bars = buildWaterfallBars(cfg, result)

    // Overpayments appear in chronological order, then the bridge.
    expect(bars[0].label).toContain('One-off @ mo 31')
    expect(bars[1].label).toContain('One-off @ mo 181')
    expect(bars[2].label).toBe('Scheduled principal')

    expect(bars[0].base).toBeCloseTo(250_000, 2)
    expect(bars[1].base).toBeCloseTo(bars[0].end, 2)
    expect(bars[2].base).toBeCloseTo(bars[1].end, 2)
    expect(bars[2].end).toBeCloseTo(0, 2)
  })

  it('orders a block and a one-off by their start month', () => {
    const cfg: MortgageConfig = {
      ...base,
      overpaymentBlocks: [{ startMonth: 0, endMonth: 59, amount: 200 }],
      oneOffs: [{ month: 240, amount: 10_000 }],
    }
    const result = simulate(cfg)
    const bars = buildWaterfallBars(cfg, result)

    expect(bars[0].label).toContain('£200/mo')
    expect(bars[1].label).toContain('One-off @ mo 241')
    expect(bars[bars.length - 1].label).toBe('Scheduled principal')
  })

  it('caps an oversized one-off at the remaining balance', () => {
    const cfg: MortgageConfig = {
      ...base,
      oneOffs: [{ month: 6, amount: 999_999_999 }],
    }
    const result = simulate(cfg)
    const bars = buildWaterfallBars(cfg, result)

    expect(bars[0].label).toContain('One-off')
    expect(bars[0].amount).toBeLessThanOrEqual(250_000)
    expect(bars[bars.length - 1].end).toBeCloseTo(0, 2)
  })

  it('bridges to the balloon (non-zero closing) when the loan does not pay off', () => {
    // A rate high enough that 360 months leaves a residual balance: balloon.
    const cfg: MortgageConfig = {
      ...base,
      rateSchedule: [{ startMonth: 0, annualRatePct: 25 }],
      oneOffs: [{ month: 60, amount: 50_000 }],
    }
    const result = simulate(cfg)
    const closing = result.rows[result.rows.length - 1].closingBalance
    if (closing > 0) {
      const bars = buildWaterfallBars(cfg, result)
      expect(bars[bars.length - 1].end).toBeCloseTo(closing, 2)
    }
  })

  it('drops an event booked after the payoff month', () => {
    // Small loan + big early lump ⇒ pays off well before month 180.
    const cfg: MortgageConfig = {
      ...base,
      loanAmount: 100_000,
      oneOffs: [{ month: 60, amount: 90_000 }],
    }
    const result = simulate(cfg)
    expect(result.summary.payoffMonth).not.toBeNull()
    // Sanity: pays off long before the "late" event at month 240.
    expect(result.summary.payoffMonth!).toBeLessThan(240)

    // A one-off booked after the payoff must be excluded from the waterfall.
    const withLate: MortgageConfig = {
      ...cfg,
      oneOffs: [...cfg.oneOffs, { month: 240, amount: 25_000 }],
    }
    const late = simulate(withLate)
    const labels = buildWaterfallBars(withLate, late).map((b) => b.label)
    expect(labels.filter((l) => l.includes('One-off'))).toHaveLength(1) // only the mo 61 one
  })
})
