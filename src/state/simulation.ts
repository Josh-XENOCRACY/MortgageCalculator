import { useMemo } from 'react'
import { simulate } from '@/core/engine'
import { impactBetween } from '@/core/impact'
import type { MortgageConfig, SimulationResult } from '@/core/types'
import { useMortgageStore } from './store'

export interface SimulationBundle {
  adjusted: SimulationResult
  baseline: SimulationResult
  impact: ReturnType<typeof impactBetween>
}

export function withNoOverpayments(config: MortgageConfig): MortgageConfig {
  return { ...config, overpaymentBlocks: [], oneOffs: [] }
}

/**
 * Returns the simulated schedule for the current config, plus a no-overpayment
 * baseline (per plan §5.3) and the impact delta between the two.
 * Recomputes only when the config reference changes.
 */
export function useSimulation(): SimulationBundle {
  const config = useMortgageStore((s) => s.config)
  return useMemo(() => {
    const baseline = simulate(withNoOverpayments(config))
    const adjusted = simulate(config)
    return {
      adjusted,
      baseline,
      impact: impactBetween(baseline.summary, adjusted.summary),
    }
  }, [config])
}
