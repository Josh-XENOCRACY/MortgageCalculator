import type { MortgageConfig, SimulationResult } from './types'
import { round2 } from './format'

/** One bar in the overpayment waterfall (plan §7, chart 5). */
export interface WaterfallBar {
  label: string
  /** Running balance before this step. */
  base: number
  /** Amount removed by this step (>= 0); the bar height. */
  amount: number
  /** Balance after this step; also the value carried into the next bar. */
  end: number
}

/** One overpayment event: its label, when it acts, and its total. */
interface OverEvent {
  label: string
  month: number
  amount: number
}

/** Flatten one-offs and blocks into chronologically-ordered overpayment events. */
function collectOverpaymentEvents(config: MortgageConfig): OverEvent[] {
  const evs: OverEvent[] = []
  for (const o of config.oneOffs) {
    if (o.amount <= 0) continue
    evs.push({ label: `One-off @ mo ${o.month + 1}`, month: o.month, amount: o.amount })
  }
  for (const b of config.overpaymentBlocks) {
    if (b.amount <= 0) continue
    const n = b.endMonth - b.startMonth + 1
    evs.push({
      label: `£${Math.round(b.amount)}/mo x ${n}`,
      month: b.startMonth,
      amount: b.amount * n,
    })
  }
  return evs.sort((a, b) => a.month - b.month)
}

/**
 * Build the overpayment waterfall bars (plan §7, chart 5). Pure and deterministic.
 *
 * One bar per overpayment event, in chronological order, each showing the balance
 * it removes on top of the scheduled payments. A final "Scheduled principal" bar
 * bridges the remainder down to the loan's actual closing balance (0 when it pays
 * off, or the balloon amount when it does not).
 */
export function buildWaterfallBars(
  config: MortgageConfig,
  result: SimulationResult
): WaterfallBar[] {
  const payoffMonth = result.summary.payoffMonth
  const closing =
    result.rows.length > 0 ? result.rows[result.rows.length - 1].closingBalance : config.loanAmount
  const bar: WaterfallBar[] = []
  let running = config.loanAmount

  for (const e of collectOverpaymentEvents(config)) {
    if (payoffMonth !== null && e.month > payoffMonth) continue
    const amt = Math.min(e.amount, running)
    if (amt <= 0) continue
    bar.push({
      label: e.label,
      base: round2(running),
      amount: round2(amt),
      end: round2(running - amt),
    })
    running -= amt
  }

  // Bridge the balance left after overpayments down to the true closing balance
  // (0 when it pays off, the balloon amount when it does not) via scheduled payments.
  const scheduled = running - closing
  if (scheduled > 1e-9) {
    bar.push({
      label: 'Scheduled principal',
      base: round2(running),
      amount: round2(scheduled),
      end: round2(closing),
    })
  }

  return bar
}
