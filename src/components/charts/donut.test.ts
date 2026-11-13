import { describe, expect, it } from 'vitest'
import { buildDonutOption } from './DonutChart'
import { simulate } from '@/core/engine'
import type { MortgageConfig, Summary } from '@/core/types'
import { PALETTE } from './theme'

function slices(opt: unknown): { name: string; value: number }[] {
  return (opt as { series: [{ data: { name: string; value: number }[] }] }).series[0].data
}

const summary: Summary = {
  payoffMonth: 360,
  principalRepaid: 350_000,
  totalInterest: 368_119,
  totalScheduledPaid: 718_119,
  totalOverpaymentsApplied: 0,
  balloon: 0,
  firstScheduledPayment: 1_990,
  maxMonthlyLiability: 1_990,
}

describe('donut: true partition of total outlay', () => {
  it('principal + interest sums exactly to the centre total', () => {
    const opt = buildDonutOption({ summary }, false)
    const d = slices(opt)
    expect(d.map((s) => s.name)).toEqual(['Principal', 'Interest'])
    const sum = d.reduce((s, x) => s + x.value, 0)
    expect(sum).toBe(350_000 + 368_119)
    // Centre must equal principal + interest — NOT scheduled + interest (which
    // double-counts interest, since payments already include it).
    expect(sum).toBe(summary.principalRepaid + summary.totalInterest)
    expect(sum).not.toBe(summary.totalScheduledPaid + summary.totalInterest)
  })

  it('overpayments show up as principal paid, not a third slice', () => {
    const cfg: MortgageConfig = {
      loanAmount: 200_000,
      termMonths: 60,
      rateSchedule: [{ startMonth: 0, annualRatePct: 4 }],
      overpaymentBlocks: [{ startMonth: 10, endMonth: 59, amount: 500 }],
      oneOffs: [{ month: 30, amount: 10_000 }],
      overpaymentMode: 'reduce_term',
    }
    const { summary, rows } = simulate(cfg)
    expect(summary.principalRepaid).toBeCloseTo(200_000, -4)
    const opt = buildDonutOption({ summary }, false)
    const d = slices(opt)
    expect(d.length).toBe(2)
    const sum = d.reduce((s, x) => s + x.value, 0)
    expect(sum).toBeCloseTo(summary.principalRepaid + summary.totalInterest, -4)
    expect(rows[rows.length - 1].closingBalance).toBe(0)
  })

  it('colours principal/interest from the palette', () => {
    const opt = buildDonutOption({ summary }, false) as { series: [{ color?: string[] }] }
    expect(opt.series[0].color).toEqual([PALETTE.principal, PALETTE.interest])
  })
})
