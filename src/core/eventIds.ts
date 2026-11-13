import type { MortgageConfig } from './types'

/**
 * Assign a stable `id` to every overpayment event that lacks one.
 *
 * Every entry point (UI store, URL parse, preset load) must run the config
 * through this so that:
 *  - multiple events in the same month never collide (the engine sums them,
 *    keyed per month — identity must be per event, not per month), and
 *  - an event's marginal-impact calculation can remove *exactly* that event
 *    by id, even when another event shares its month.
 *
 * Events that already have an id keep it (idempotency).
 */
export function normalizeIds(config: MortgageConfig): MortgageConfig {
  const random = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return {
    ...config,
    overpaymentBlocks: config.overpaymentBlocks.map((b) => (b.id ? b : { ...b, id: random() })),
    oneOffs: config.oneOffs.map((o) => (o.id ? o : { ...o, id: random() })),
  }
}
