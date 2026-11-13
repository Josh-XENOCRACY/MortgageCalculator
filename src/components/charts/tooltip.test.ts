import { describe, expect, it } from 'vitest'
import { buildFlowOption } from './FlowChart'
import { buildBalanceOption } from './BalanceChart'
import { simulate } from '@/core/engine'
import type { MortgageConfig } from '@/core/types'

const cfg: MortgageConfig = {
  loanAmount: 200_000,
  termMonths: 60,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4 }],
  overpaymentBlocks: [{ startMonth: 10, endMonth: 14, amount: 500 }],
  oneOffs: [{ month: 30, amount: 10_000 }],
  overpaymentMode: 'reduce_term',
}

function tip(opt: unknown, params: unknown) {
  const f = (opt as { tooltip?: { formatter?: (p: unknown) => string } }).tooltip?.formatter
  if (!f) throw new Error('no formatter')
  return f(params)
}

describe('chart tooltips include per-month payment figures', () => {
  const result = simulate(cfg)
  const row30 = result.rows.find((r) => r.month === 30)!
  const expectedScheduled = `Scheduled payment: `
  const expectedTotal = `Total paid this month: `

  it('flow chart shows scheduled + actual payment at a lump month', () => {
    const opt = buildFlowOption({ result }, false)
    const out = tip(opt, [
      { seriesName: 'Principal', dataIndex: 30, value: [30, 0] },
      { seriesName: 'Interest', dataIndex: 30, value: [30, 0] },
    ])
    expect(out).toContain('Month 30')
    expect(out).toContain(expectedScheduled)
    expect(out).toContain(expectedTotal)
    // fmtFullGBP displays whole pounds; assert the rounded figures appear.
    expect(out).toContain(`£${Math.round(row30.scheduledPayment).toLocaleString('en-GB')}`)
    const actual = row30.scheduledPayment + row30.overpaymentPaid
    expect(out).toContain(`£${Math.round(actual).toLocaleString('en-GB')}`)
  })

  it('balance chart shows scheduled + actual payment', () => {
    const opt = buildBalanceOption({ result, config: cfg }, false)
    const out = tip(opt, [{ seriesName: 'Balance', dataIndex: 30, value: [30, 0] }])
    expect(out).toContain('Month 30')
    expect(out).toContain(expectedScheduled)
    expect(out).toContain(expectedTotal)
  })
})
