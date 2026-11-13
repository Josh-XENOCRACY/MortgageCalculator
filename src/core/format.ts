/**
 * UI-facing formatters. Pure, no React.
 *
 * These are the only place amounts are rounded for display (Intl 0 or 2 d.p.).
 * The financial core (engine/math) applies the lender ledger convention —
 * interest to the nearest penny, closing balance to the nearest whole pound —
 * in the model itself. Chart series round via round2 (charts/theme.ts), which
 * is a display concern kept at the chart boundary.
 */
// Display-side concept, defined here (not in impact.ts) to keep the financial
// core free of any display imports. impact.ts imports this for `impactBetween`.
export interface ImpactDelta {
  /** Months saved (positive) vs baseline. */
  monthsSaved: number
  /** Interest saved (positive) vs baseline, in currency units. */
  interestSaved: number
}

const gbpWhole = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})
const gbpPence = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const gbpCompact = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Whole pounds: "£350,000". */
export function gbp(amount: number, withPence: boolean = false): string {
  return withPence ? gbpPence.format(amount) : gbpWhole.format(amount)
}

/** Whole, ungrouped for axis labels and tooltips: "£1.2M" (compact) / "£2,712". */
export const fmtCompactGBP = (v: number): string => gbpCompact.format(v)
export const fmtFullGBP = (v: number): string => gbpWhole.format(v)

/** Round to 2 d.p. — used for chart series display. (The model's penny rounding is math.roundPenny.) */
export const round2 = (n: number): number => Math.round(n * 100) / 100

function termPart(months: number): string {
  const abs = Math.abs(months)
  if (abs < 1) return 'under a month'
  if (abs < 12) return `${abs} ${abs === 1 ? 'month' : 'months'}`
  const yrs = Math.floor(abs / 12)
  const rem = abs % 12
  if (rem === 0) return `${yrs} ${yrs === 1 ? 'year' : 'years'}`
  return `${yrs}y ${rem}m`
}

/** A span of months, e.g. "2 months", "1 year", "3y 6m". */
export function monthsLabel(months: number): string {
  return termPart(months)
}

/** A term length, e.g. "3 months", "25 years", "2y 6m". */
export function termLabel(months: number): string {
  const abs = Math.abs(months)
  if (abs === 0) return '0 months'
  if (abs % 12 === 0) return `${abs / 12} ${abs === 12 ? 'year' : 'years'}`
  return termPart(abs)
}

/** "2 months · £4,300"-style delta for an ImpactDelta. */
export function formatImpact(d: ImpactDelta): { months: string; interest: string } {
  return { months: monthsLabel(d.monthsSaved), interest: gbp(Math.abs(d.interestSaved)) }
}
