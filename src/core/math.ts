/**
 * Standard level-payment amortisation formulas (annuity, end-of-period compounding).
 *
 * Rounding (lender ledger convention): `roundPenny` and `roundWhole` are the
 * model's arithmetic rounding (half-up). engine.simulate applies them each month:
 * interest to the nearest penny, the month-closing balance to the nearest whole
 * pound. The level payment itself stays full precision (see engine.simulate).
 * Display rounding lives in core/format.ts (Intl) and the chart series (round2).
 */

export interface Amortisation {
  payment: number
}

export function levelPayment(principal: number, monthlyRate: number, n: number): Amortisation {
  if (principal <= 0 || n <= 0) return { payment: 0 }
  if (monthlyRate === 0) {
    return { payment: principal / n }
  }
  const factor = Math.pow(1 + monthlyRate, n)
  const payment = (principal * monthlyRate * factor) / (factor - 1)
  return { payment }
}

/** Round half-up to 2 d.p. (0.005 → 0.01). */
export const roundPenny = (n: number): number => Math.floor(n * 100 + 0.5) / 100

/** Round half-up to whole units (0.6 → 1, 0.4 → 0). */
export const roundWhole = (n: number): number => Math.floor(n + 0.5)
