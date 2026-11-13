import { simulate } from './engine'
import { impactBetween } from './impact'
import type { ImpactDelta } from './impact'
import type { MortgageConfig } from './types'

/**
 * Compute the marginal impact of a single event by comparing the full
 * against the config with that event removed. `removeEvent` must return the
 * config with exactly one event stripped.
 */
export function impactOfEvent(
  config: MortgageConfig,
  removeEvent: (c: MortgageConfig) => MortgageConfig,
): ImpactDelta {
  const withEvent = simulate(config)
  const withoutEvent = simulate(removeEvent(config))
  return impactBetween(withoutEvent.summary, withEvent.summary)
}
