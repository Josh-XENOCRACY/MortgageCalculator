import type { InterestRateConvention, MortgageConfig, RatePeriod } from './types'

export const NOMINAL_12: InterestRateConvention = {
  id: 'nominal12',
  label: 'Annual rate / 12 per month',
  monthlyRate: (pct) => pct / 100 / 12,
}

export interface EngineOptions {
  convention?: InterestRateConvention
}

export const DEFAULT_OPTIONS: Required<EngineOptions> = {
  convention: NOMINAL_12,
}

/** Resolve which rate is in force at a given month, per plan §5.4. */
export function rateAtMonth(sorted: RatePeriod[], month: number): number {
  // An empty schedule is legal (e.g. an impact calc that removes the sole tier);
  // treat it as a 0% rate rather than crashing the whole app.
  let inForce = sorted.length > 0 ? sorted[0].annualRatePct : 0
  for (const p of sorted) {
    if (p.startMonth <= month) inForce = p.annualRatePct
    else break
  }
  return inForce
}

export function sortedSchedule(config: MortgageConfig): RatePeriod[] {
  return config.rateSchedule
    .map((p, i) => ({ ...p, sortKey: p.startMonth * 1e6 + i }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _sk, ...p }) => p)
}
