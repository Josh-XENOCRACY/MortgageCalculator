import type { Summary } from './types'
import type { ImpactDelta } from './format'

export type { ImpactDelta }

/**
 * Compare two simulations (e.g. baseline vs with-one-event) and report
 * how much earlier the payoff is and how much interest is saved.
 */
export function impactBetween(baseline: Summary, withEvent: Summary): ImpactDelta {
  const bPayoff = baseline.payoffMonth === null ? null : baseline.payoffMonth
  const aPayoff = withEvent.payoffMonth === null ? null : withEvent.payoffMonth

  let monthsSaved = 0
  if (bPayoff !== null && aPayoff !== null) monthsSaved = bPayoff - aPayoff
  else if (bPayoff === null && aPayoff !== null) monthsSaved = 1 // came back from balloon
  // both null or b paid off earlier: monthsSaved stays 0 (or negative below)

  return {
    monthsSaved,
    interestSaved: baseline.totalInterest - withEvent.totalInterest,
  }
}
