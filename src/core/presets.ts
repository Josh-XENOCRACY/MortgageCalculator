import type { MortgageConfig } from './types'

export interface Preset {
  id: string
  name: string
  blurb: string
  config: MortgageConfig
}

export function baseConfig(): MortgageConfig {
  return {
    loanAmount: 350_000,
    termMonths: 300,
    rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
    overpaymentBlocks: [],
    oneOffs: [],
    overpaymentMode: 'reduce_term',
  }
}

export const PRESETS: Preset[] = [
  {
    id: 'standard',
    name: 'Standard 25y',
    blurb: '£350k · 25y · 4.5% flat',
    config: baseConfig(),
  },
  {
    id: 'tracker-to-svr',
    name: 'Tracker → SVR',
    blurb: '6.5% tracker for 5y, then 5.25% SVR (payment re-amortised after the step)',
    config: {
      ...baseConfig(),
      rateSchedule: [
        { startMonth: 0, annualRatePct: 6.5 },
        { startMonth: 60, annualRatePct: 5.25 },
      ],
    },
  },
  {
    id: 'overpay-5y',
    name: '£400/mo for 5y',
    blurb: 'Monthly overpayment months 1–60, reduce term',
    config: {
      ...baseConfig(),
      overpaymentBlocks: [{ startMonth: 0, endMonth: 59, amount: 400 }],
    },
  },
  {
    id: 'windfall',
    name: '£40k windfall yr 20',
    blurb: 'Lump sum at month 240, reduce payment',
    config: {
      ...baseConfig(),
      oneOffs: [{ month: 240, amount: 40_000 }],
      overpaymentMode: 'reduce_payment',
    },
  },
  {
    id: 'mixed-modes',
    name: '£400/mo + £25k windfall',
    blurb: 'Months 1–60 reduce term, then month 200 windfall switches to reduce payment',
    config: {
      ...baseConfig(),
      overpaymentBlocks: [{ startMonth: 0, endMonth: 59, amount: 400, mode: 'reduce_term' }],
      oneOffs: [{ month: 200, amount: 25_000, mode: 'reduce_payment' }],
    },
  },
]
