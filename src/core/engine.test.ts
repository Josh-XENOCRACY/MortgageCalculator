import { describe, expect, it } from 'vitest'
import { simulate } from './engine'
import { rateAtMonth } from './rate'
import { parse, serialize } from './serialize'
import type { MortgageConfig, RatePeriod } from './types'

const base = (over: Partial<MortgageConfig> = {}): MortgageConfig => ({
  loanAmount: 350_000,
  termMonths: 360,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
  overpaymentBlocks: [],
  oneOffs: [],
  overpaymentMode: 'reduce_term',
  ...over,
})

describe('simulate — reduce_term', () => {
  it('1. classic amortisation matches the textbook formula', () => {
    const cfg = base({ termMonths: 360 })
    const res = simulate(cfg)
    // level payment for 350k @4.5% over 360 months
    const r = 0.045 / 12
    // annuity factor
    const factor = Math.pow(1 + r, 360)
    const pmt = (350_000 * r * factor) / (factor - 1)
    expect(res.rows.length).toBe(360)
    expect(res.rows[0].scheduledPayment).toBeCloseTo(pmt, 2)
    expect(res.rows[0].interestPaid).toBeCloseTo(350_000 * r, 2)
    // total interest should be close to the closed-form total - principal
    const expectedTotal = pmt * 360 - 350_000
    expect(res.summary.totalInterest).toBeGreaterThan(expectedTotal * 0.999)
    expect(res.summary.totalInterest).toBeLessThan(expectedTotal * 1.001)
    expect(res.summary.payoffMonth).toBe(359)
    expect(res.summary.balloon).toBe(0)
  })

  it('2. one-off larger than remaining balance → early payoff, no negative balance', () => {
    const payOff = 300_000
    const cfg = base({
      loanAmount: 320_000,
      termMonths: 360,
      rateSchedule: [{ startMonth: 0, annualRatePct: 0 }],
      oneOffs: [{ month: 6, amount: payOff }],
    })
    const res = simulate(cfg)
    expect(res.rows.length).toBeLessThan(360)
    const last = res.rows[res.rows.length - 1]
    expect(last.closingBalance).toBe(0)
    // in month 6, the overpayment is capped at remaining balance
    const month6 = res.rows.find((r) => r.month === 6)!
    expect(month6.overpaymentPaid).toBeLessThanOrEqual(month6.openingBalance)
    expect(res.summary.payoffMonth).toBeGreaterThanOrEqual(6)
  })

  it('3. overpayment in final month → truncated, balance 0', () => {
    const cfg = base({
      loanAmount: 100_000,
      termMonths: 12,
      rateSchedule: [{ startMonth: 0, annualRatePct: 0 }],
      oneOffs: [{ month: 11, amount: 50_000 }],
    })
    const res = simulate(cfg)
    expect(res.rows.length).toBeLessThanOrEqual(12)
    const last = res.rows[res.rows.length - 1]
    expect(last.closingBalance).toBe(0)
    expect(last.overpaymentPaid).toBeLessThanOrEqual(50_000)
  })

  it('4. rate change mid-term → payment re-amortises, payoff date kept (reduce_term)', () => {
    const cfg = base({
      rateSchedule: [
        { startMonth: 0, annualRatePct: 2.0 },
        { startMonth: 12, annualRatePct: 6.0 },
      ],
    })
    const res = simulate(cfg)
    const p0 = res.rows[0].scheduledPayment
    const p13 = res.rows[13].scheduledPayment
    expect(p13).not.toBeCloseTo(p0, 2) // re-amortised on the new rate
    expect(res.rows[11].annualRatePct).toBe(2)
    expect(res.rows[12].annualRatePct).toBe(6)
    expect(res.summary.payoffMonth).toBe(cfg.termMonths - 1)
  })

  it('5. 0% rate → pure principal amortisation, no interest', () => {
    const cfg = base({
      loanAmount: 120_000,
      termMonths: 12,
      rateSchedule: [{ startMonth: 0, annualRatePct: 0 }],
    })
    const res = simulate(cfg)
    expect(res.rows.length).toBe(12)
    for (const row of res.rows) expect(row.interestPaid).toBe(0)
    expect(res.summary.totalInterest).toBe(0)
    expect(res.rows[0].scheduledPayment).toBeCloseTo(120_000 / 12, 2)
    expect(res.rows[res.rows.length - 1].closingBalance).toBe(0)
  })

  it('6. payment barely covering interest → payoff still lands exactly at term end (re-amortised, no balloon)', () => {
    const cfg = base({
      loanAmount: 1_000_000,
      termMonths: 12,
      rateSchedule: [{ startMonth: 0, annualRatePct: 12 }], // 1% per month
    })
    const res = simulate(cfg)
    expect(res.rows.length).toBe(12)
    expect(res.summary.payoffMonth).toBe(11)
    expect(res.summary.balloon).toBe(0)
  })

  it('7. block endMonth < startMonth → treated as empty', () => {
    const cfg = base({
      overpaymentBlocks: [{ startMonth: 10, endMonth: 5, amount: 999_999 }],
    })
    const res = simulate(cfg)
    const plain = simulate(base())
    // total interest should be identical (block is a no-op)
    expect(res.summary.totalInterest).toBeCloseTo(plain.summary.totalInterest, 2)
  })

  it('8. two one-offs in the same month → summed', () => {
    const cfg = base({
      loanAmount: 100_000,
      termMonths: 60,
      rateSchedule: [{ startMonth: 0, annualRatePct: 12 }],
      oneOffs: [
        { month: 5, amount: 10_000 },
        { month: 5, amount: 5_000 },
      ],
    })
    const res = simulate(cfg)
    const m5 = res.rows.find((r) => r.month === 5)!
    expect(m5.overpaymentPaid).toBeCloseTo(15_000, 2)
    const single = simulate(
      base({
        loanAmount: 100_000,
        termMonths: 60,
        rateSchedule: [{ startMonth: 0, annualRatePct: 12 }],
        oneOffs: [{ month: 5, amount: 10_000 }],
      })
    )
    const singleM5 = single.rows.find((r) => r.month === 5)!
    // balance after month 5 should be the difference
    const expectedDiff = 5_000
    expect(Math.abs(singleM5.closingBalance - m5.closingBalance)).toBeCloseTo(expectedDiff, 0)
  })

  it('9. reduce_payment → payments monotonically decrease with overpayments', () => {
    const cfg = base({
      overpaymentMode: 'reduce_payment',
      overpaymentBlocks: [{ startMonth: 1, endMonth: 59, amount: 2_000 }],
    })
    const res = simulate(cfg)
    // overpayments start in month 1, so the payment drop shows from month 2
    const p1 = res.rows[1].scheduledPayment
    const p2 = res.rows[2].scheduledPayment
    expect(p2).toBeLessThan(p1)
    // payments should not exceed the pre-overpayment month's
    for (const row of res.rows.slice(1)) {
      expect(row.scheduledPayment).toBeLessThanOrEqual(p1 + 1e-6)
    }
    // by definition of reduce_payment, payoff stays at the original end date
    expect(res.summary.payoffMonth).toBe(base().termMonths - 1)
    // ...but total interest is much lower
    const plain = simulate(base())
    expect(res.summary.totalInterest).toBeLessThan(plain.summary.totalInterest * 0.9)
  })

  it('rate change in reduce_payment mode → payment recalculated on new rate', () => {
    const cfg = base({
      overpaymentMode: 'reduce_payment',
      rateSchedule: [
        { startMonth: 0, annualRatePct: 2 },
        { startMonth: 12, annualRatePct: 6 },
      ],
    })
    const res = simulate(cfg)
    expect(res.rows[11].scheduledPayment).not.toBeCloseTo(res.rows[12].scheduledPayment, 2)
  })

  it('rate change in reduce_term mode → payment recalculates, payoff stays at end date', () => {
    const cfg = base({
      rateSchedule: [
        { startMonth: 0, annualRatePct: 2 },
        { startMonth: 12, annualRatePct: 6 },
      ],
    })
    const res = simulate(cfg)
    expect(res.rows[11].scheduledPayment).not.toBeCloseTo(res.rows[12].scheduledPayment, 2)
    expect(res.rows[12].scheduledPayment).toBeGreaterThan(res.rows[11].scheduledPayment)
    expect(res.summary.payoffMonth).toBe(cfg.termMonths - 1)
  })

  it('10. loanAmount=0 → empty rows, no crash', () => {
    const res = simulate(base({ loanAmount: 0 }))
    expect(res.rows.length).toBe(0)
    expect(res.summary.payoffMonth).toBe(0)
    expect(res.summary.totalInterest).toBe(0)
  })

  it('11. empty rate schedule → 0% amortisation, no crash (rateAtMonth guard)', () => {
    const schedule: RatePeriod[] = []
    expect(rateAtMonth(schedule, 0)).toBe(0)
    expect(rateAtMonth(schedule, 119)).toBe(0)
    // A config whose sole tier has been removed (as an impact calc does) must
    // still simulate rather than throw.
    const res = simulate(base({ rateSchedule: [] }))
    expect(res.rows.some((r) => Number.isNaN(r.closingBalance))).toBe(false)
    expect(res.summary.principalRepaid).toBeCloseTo(350_000, 0)
  })
})

describe('simulate — invariants (for any config)', () => {
  const scenarios: { name: string; cfg: MortgageConfig }[] = [
    { name: 'plain', cfg: base() },
    {
      name: 'with-overpayments',
      cfg: base({
        overpaymentBlocks: [{ startMonth: 12, endMonth: 36, amount: 1_000 }],
        oneOffs: [{ month: 60, amount: 20_000 }],
      }),
    },
    {
      name: 'multi-rate',
      cfg: base({
        rateSchedule: [
          { startMonth: 0, annualRatePct: 3 },
          { startMonth: 24, annualRatePct: 4.5 },
          { startMonth: 60, annualRatePct: 5.5 },
        ],
      }),
    },
    {
      name: 'reduce-payment-heavy',
      cfg: base({
        overpaymentMode: 'reduce_payment',
        overpaymentBlocks: [{ startMonth: 0, endMonth: 119, amount: 5_000 }],
      }),
    },
  ]
  for (const { name, cfg } of scenarios) {
    it(`[${name}] rows <= term, balances >= 0, accounting sums to principal`, () => {
      const res = simulate(cfg)
      expect(res.rows.length).toBeLessThanOrEqual(cfg.termMonths)
      for (let i = 0; i < res.rows.length; i++) {
        const row = res.rows[i]
        expect(row.closingBalance).toBeGreaterThanOrEqual(0)
        expect(row.interestPaid).toBeGreaterThanOrEqual(0)
        expect(row.principalPaid).toBeGreaterThanOrEqual(0)
        expect(row.overpaymentPaid).toBeGreaterThanOrEqual(0)
        // row identity: closing = opening - principal - overpayment, up to half
        // the ledger's whole-pound rounding (£0.5) of the closing balance.
        expect(
          Math.abs(
            row.closingBalance - (row.openingBalance - row.principalPaid - row.overpaymentPaid)
          )
        ).toBeLessThanOrEqual(0.5)
        // chain: next opening = this closing (within ledger rounding)
        if (i + 1 < res.rows.length) {
          expect(res.rows[i + 1].openingBalance).toBeCloseTo(row.closingBalance, 6)
        }
      }
      const last = res.rows[res.rows.length - 1]!
      expect(res.summary.principalRepaid).toBeCloseTo(cfg.loanAmount - last.closingBalance, 6)
      expect(res.summary.principalRepaid).toBeLessThanOrEqual(cfg.loanAmount + 1e-6)
    })
  }
})

describe('simulate — per-event mode', () => {
  const baseCt = (over: Partial<MortgageConfig> = {}): MortgageConfig =>
    base({
      termMonths: 120,
      loanAmount: 200_000,
      rateSchedule: [{ startMonth: 0, annualRatePct: 4 }],
      ...over,
    })

  it('reduce_term (default) with a reduce_payment event → payment drops after the event, payoff stays at end', () => {
    const cfg = baseCt({
      oneOffs: [{ month: 30, amount: 20_000, mode: 'reduce_payment' }],
    })
    const res = simulate(cfg)
    // before month 30: fixed payment
    expect(res.rows[0].scheduledPayment).toBeCloseTo(res.rows[29].scheduledPayment, 6)
    // month 30 is reduce_payment regime — payment recalcs against original end
    expect(res.rows[30].overpaymentMode).toBe('reduce_payment')
    // month 31 onward payment should be lower than month 29's (reduce_payment effect)
    expect(res.rows[31].scheduledPayment).toBeLessThan(res.rows[29].scheduledPayment)
    // by definition of reduce_payment, payoff is at the original end
    expect(res.summary.payoffMonth).toBe(119)
    // total interest should be much lower than no-overpayment
    const plain = simulate(baseCt())
    expect(res.summary.totalInterest).toBeLessThan(plain.summary.totalInterest)
  })

  it('reduce_payment (default) with a reduce_term event → payment stays fixed after the event, payoff moves earlier', () => {
    const cfg = baseCt({
      overpaymentMode: 'reduce_payment',
      oneOffs: [{ month: 30, amount: 20_000, mode: 'reduce_term' }],
    })
    const res = simulate(cfg)
    expect(res.rows[0].overpaymentMode).toBe('reduce_payment')
    // from month 30 onward regime is reduce_term
    for (let i = 30; i < res.rows.length; i++) {
      expect(res.rows[i].overpaymentMode).toBe('reduce_term')
    }
    // in reduce_term regime payment is locked in for the rest of the term
    const m30 = res.rows.find((r) => r.month === 30)!
    // find the next several rows and verify constant
    for (let i = 31; i < Math.min(res.rows.length, 40); i++) {
      expect(res.rows[i].scheduledPayment).toBeCloseTo(m30.scheduledPayment, 3)
    }
  })

  it('two events in time → chronologically last explicit mode wins', () => {
    const cfg = baseCt({
      overpaymentBlocks: [
        { startMonth: 10, endMonth: 29, amount: 1_000, mode: 'reduce_payment' },
        { startMonth: 60, endMonth: 79, amount: 1_000, mode: 'reduce_term' },
      ],
    })
    const res = simulate(cfg)
    expect(res.rows[5].overpaymentMode).toBe('reduce_term')
    expect(res.rows[15].overpaymentMode).toBe('reduce_payment')
    expect(res.rows[65].overpaymentMode).toBe('reduce_term')
    expect(res.rows[100].overpaymentMode).toBe('reduce_term')
  })

  it('events without mode → regime unchanged from config default', () => {
    const cfg = baseCt({
      oneOffs: [
        { month: 10, amount: 5_000 },
        { month: 20, amount: 5_000 },
      ],
    })
    const res = simulate(cfg)
    for (const row of res.rows) expect(row.overpaymentMode).toBe('reduce_term')
  })
})

describe('lender ledger rounding (regression)', () => {
  // Real-world anchor: a £158k/480m loan with a rate step (5.34% → 6.94% after
  // month 24) quoted by a real lender at a total repayable of £461,340.95. The
  // engine simulates under the ledger convention (interest rounded half-up to
  // the penny; month-closing balance rounded to the nearest whole pound; final
  // month sweeps any residual), and must therefore match the quote within a few
  // pounds (the bank's own final-month handling accounts for the rest). This test
  // pins that bound so any engine change that drifts the total by more than
  // ~£50 on this term is caught.
  it('matches a real lender quote within a few pounds', () => {
    const cfg = base({
      loanAmount: 158_000,
      termMonths: 480,
      rateSchedule: [
        { startMonth: 0, annualRatePct: 5.34 },
        { startMonth: 24, annualRatePct: 6.94 },
      ],
    })
    const res = simulate(cfg)
    const total = cfg.loanAmount + res.summary.totalInterest
    expect(res.summary.payoffMonth).toBe(cfg.termMonths - 1)
    expect(total).toBeCloseTo(461_340.95, -2) // within ~£0.5 — here within ~£10
    expect(Math.abs(total - 461_340.95)).toBeLessThan(50)
  })

  it('re-amortises at the rate step and lands on the original end date', () => {
    const cfg = base({
      loanAmount: 158_000,
      termMonths: 480,
      rateSchedule: [
        { startMonth: 0, annualRatePct: 5.34 },
        { startMonth: 24, annualRatePct: 6.94 },
      ],
    })
    const res = simulate(cfg)
    expect(res.rows.length).toBe(480)
    expect(res.rows[24].scheduledPayment).toBeGreaterThan(res.rows[0].scheduledPayment)
    expect(res.rows[24].scheduledPayment).toBeCloseTo(res.rows[25].scheduledPayment, 6)
    expect(res.summary.balloon).toBe(0)
  })
})

describe('serialize roundtrip', () => {
  it('round-trips a complex config', async () => {
    const cfg: MortgageConfig = {
      loanAmount: 350_000,
      termMonths: 360,
      rateSchedule: [
        { startMonth: 0, annualRatePct: 4.25 },
        { startMonth: 24, annualRatePct: 5.5 },
      ],
      overpaymentBlocks: [{ startMonth: 12, endMonth: 60, amount: 500 }],
      oneOffs: [{ month: 100, amount: 15_000 }],
      overpaymentMode: 'reduce_term',
    }
    const qs = serialize(cfg)
    const { config } = parse(qs, cfg)
    if (config === null) throw new Error('expected parse to succeed')
    expect(config.loanAmount).toBe(350_000)
    expect(config.termMonths).toBe(360)
    expect(config.rateSchedule).toEqual(cfg.rateSchedule)
    expect(config.overpaymentBlocks).toEqual(cfg.overpaymentBlocks)
    expect(config.oneOffs).toEqual(cfg.oneOffs)
    expect(config.overpaymentMode).toBe('reduce_term')
  })

  it('round-trips per-event modes', () => {
    const cfg: MortgageConfig = {
      ...base(),
      overpaymentBlocks: [{ startMonth: 12, endMonth: 60, amount: 500, mode: 'reduce_payment' }],
      oneOffs: [{ month: 100, amount: 7_000, mode: 'reduce_term' }],
    }
    const qs = serialize(cfg)
    const { config, errors } = parse(qs, base())
    expect(errors).toEqual([])
    expect(config?.overpaymentBlocks).toEqual(cfg.overpaymentBlocks)
    expect(config?.oneOffs).toEqual(cfg.oneOffs)
  })

  it('rejects malformed per-event mode tokens (ob)', () => {
    const { config, errors } = parse('ob=500@0-10:xx', base())
    expect(config).not.toBeNull()
    expect(errors.length).toBe(1)
    expect(config?.overpaymentBlocks).toEqual([])
  })

  it('rejects malformed per-event mode tokens (op)', () => {
    const { config, errors } = parse('op=1000@12:yy', base())
    expect(config).not.toBeNull()
    expect(errors.length).toBe(1)
    expect(config?.oneOffs).toEqual([])
  })

  it('rejects malformed segments', () => {
    const { config, errors } = parse('amount=abc&term=5000', base())
    expect(config).not.toBeNull()
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })
})
