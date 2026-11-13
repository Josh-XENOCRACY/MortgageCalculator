import { levelPayment, roundPenny, roundWhole } from './math'
import type { EngineOptions } from './rate'
import { DEFAULT_OPTIONS, rateAtMonth, sortedSchedule } from './rate'
import type {
  MonthRow,
  MortgageConfig,
  OneOffPayment,
  OverpaymentBlock,
  OverpaymentMode,
  SimulationResult,
  Summary,
} from './types'

/** Flatten block + one-off events into a per-month overpayment array. */
function overpaymentPerMonth(
  termMonths: number,
  blocks: OverpaymentBlock[],
  oneOffs: OneOffPayment[]
): number[] {
  const perMonth = new Array<number>(termMonths).fill(0)
  for (const b of blocks) {
    const from = Math.max(0, Math.min(termMonths - 1, Math.floor(b.startMonth)))
    const to = Math.max(0, Math.min(termMonths - 1, Math.floor(b.endMonth)))
    for (let m = from; m <= to; m++) perMonth[m] += b.amount
  }
  for (const o of oneOffs) {
    const m = Math.floor(o.month)
    if (m >= 0 && m < termMonths) perMonth[m] += o.amount
  }
  return perMonth
}

function buildSummary(rows: MonthRow[], loanAmount: number): Summary {
  if (rows.length === 0) {
    return {
      payoffMonth: loanAmount <= 0 ? 0 : null,
      principalRepaid: 0,
      totalInterest: 0,
      totalScheduledPaid: 0,
      totalOverpaymentsApplied: 0,
      balloon: Math.max(0, loanAmount),
      firstScheduledPayment: 0,
      maxMonthlyLiability: 0,
    }
  }
  const last = rows[rows.length - 1]
  const totalInterest = rows.reduce((s, r) => s + r.interestPaid, 0)
  const totalScheduled = rows.reduce((s, r) => s + r.scheduledPayment, 0)
  const totalOverpayment = rows.reduce((s, r) => s + r.overpaymentPaid, 0)
  const principalRepaid = loanAmount - Math.max(0, last.closingBalance)
  // Absolute + relative tolerance: closed-form re-amortisation accumulates float
  // drift of a few units-in-last-place per step (~1e-3..1e-2 on a £350k loan);
  // a residual that small is rounding, not a balloon.
  const tol = Math.max(0.5, loanAmount * 1e-7)
  const payoffMonth = last.closingBalance <= tol ? last.month : null
  const maxLiability = rows.reduce(
    (mx, r) => Math.max(mx, r.scheduledPayment + r.overpaymentPaid),
    0
  )
  return {
    payoffMonth,
    principalRepaid,
    totalInterest,
    totalScheduledPaid: totalScheduled,
    totalOverpaymentsApplied: totalOverpayment,
    balloon: payoffMonth === null ? last.closingBalance : 0,
    firstScheduledPayment: rows[0].scheduledPayment,
    maxMonthlyLiability: maxLiability,
  }
}

/**
 * Build the per-month overpayment regime timeline. Month m's regime is:
 * the config-level `overpaymentMode`, overridden by the *last* event (block or
 * one-off, in chronological order) whose `mode` is set and whose effective
 * start month is <= m. An event with no `mode` never changes the regime.
 */
function modeAtMonth(
  termMonths: number,
  baseMode: OverpaymentMode,
  blocks: OverpaymentBlock[],
  oneOffs: OneOffPayment[]
): OverpaymentMode[] {
  const events = [
    ...blocks.map((b) => ({ start: b.startMonth, mode: b.mode })),
    ...oneOffs.map((o) => ({ start: o.month, mode: o.mode })),
  ]
    .filter((e): e is { start: number; mode: OverpaymentMode } => e.mode !== undefined)
    .sort((a, b) => a.start - b.start)

  const perMonth = new Array<OverpaymentMode>(termMonths).fill(baseMode)
  for (const e of events) {
    const from = Math.max(0, Math.min(termMonths - 1, Math.floor(e.start)))
    for (let m = from; m < termMonths; m++) perMonth[m] = e.mode
  }
  return perMonth
}

/**
 * Simulate the mortgage month by month. Pure and deterministic.
 *
 * Both modes: whenever the rate in force changes, the scheduled payment is
 * re-amortised over the remaining term so the original payoff date is kept.
 *
 * - reduce_term: the scheduled payment is otherwise fixed; overpayments only
 *   accelerate payoff.
 * - reduce_payment: the scheduled payment is additionally re-amortised after every
 *   overpayment, so payments drop as the balance drops — but payoff still lands on
 *   the original end date.
 *
 * An overpayment event (block or one-off) may carry an optional per-event
 * `mode`, which is a regime switch taking effect from its start month onward
 * (chronologically last event wins). This is how you mix "reduce-term" and
 * "reduce-payment" events in the same plan (see types.OverpaymentBlock.mode).
 *
 * Final payment is truncated so the closing balance never goes negative; an
 * overpayment is always clipped to the remaining balance at that month.
 *
 * Rounding (lender ledger convention): each month's interest is rounded to the
 * nearest penny (half-up), and the month-closing balance is rounded to the
 * nearest whole pound and carried forward. When a rate change re-amortises the
 * payment, it is computed on that rounded balance. The scheduled payment itself
 * stays full-precision (math.levelPayment, closed-form annuity); rounding it to
 * pence would move totals *away* from lender figures on a rising-rate step.
 *
 * Why: matching how UK lenders' ledgers actually compute, so the quoted total
 * repayable lines up with a lender's quote within a few pounds — full-precision
 * month-by-month compounding instead drifts by a few tens of pounds on a
 * ~£150k/40y loan (balance × months), the sign of which depends on the plan.
 * On a £158k/480m loan with a 5.34%→6.94% step, the full-precision total was
 * £461,404.42 vs the lender's stated £461,340.95; the ledger convention lands
 * within ~£10 of the quote. Rounding to pence still happens for display
 * (core/format.ts, Intl) and chart series (round2).
 */
export function simulate(config: MortgageConfig, options: EngineOptions = {}): SimulationResult {
  const convention = options.convention ?? DEFAULT_OPTIONS.convention
  const { loanAmount, termMonths } = config
  const schedule = sortedSchedule(config)
  const perMonth = overpaymentPerMonth(termMonths, config.overpaymentBlocks, config.oneOffs)
  const regimePerMonth = modeAtMonth(
    termMonths,
    config.overpaymentMode,
    config.overpaymentBlocks,
    config.oneOffs
  )

  const rows: MonthRow[] = []
  let balance = loanAmount
  let payment = 0
  let lastAnnual: number | null = null
  let lastMode: OverpaymentMode | null = null
  let prevOverApplied = 0

  for (let m = 0; m < termMonths && balance > 1e-9; m++) {
    const opening = balance
    const annual = rateAtMonth(schedule, m)
    const monthly = convention.monthlyRate(annual)
    const remaining = termMonths - m
    const mode = regimePerMonth[m]!

    const rateChanged = lastAnnual !== null && lastAnnual !== annual
    const modeChanged = lastMode !== null && lastMode !== mode
    const isReducePayment = mode === 'reduce_payment'
    const lastMonthOfTerm = remaining === 1
    const recalc =
      m === 0 ||
      rateChanged ||
      lastMonthOfTerm ||
      (isReducePayment && (modeChanged || prevOverApplied > 1e-9))
    if (recalc) {
      if (lastMonthOfTerm) {
        // Final month: single-period amortisation of the remaining balance so the
        // loan settles exactly at the original end date. The ledger holds balances
        // in whole pounds, so rounding can leave a small residual earlier — this
        // payment (opening × (1+monthly)) sweeps it up, the lender's
        // "final-adjusted payment". (levelPayment with n=1 equals opening×(1+monthly).)
        payment = opening * (1 + monthly)
      } else {
        payment = levelPayment(opening, monthly, remaining).payment
      }
    }

    const interest = roundPenny(opening * monthly)
    let principal = payment - interest
    if (principal < 0) principal = 0
    if (principal > opening) principal = opening

    let overApplied = Math.min(perMonth[m], opening - principal)
    if (overApplied < 0) overApplied = 0

    // Lender ledger: the balance is held in whole pounds, so close to the
    // nearest pound and carry that forward. A residual under half a pound is
    // written off (the loan is settled).
    const closingRaw = opening - principal - overApplied
    const closing = closingRaw <= 0.5 ? 0 : roundWhole(closingRaw)
    balance = closing
    lastAnnual = annual
    lastMode = mode
    prevOverApplied = overApplied

    rows.push({
      month: m,
      openingBalance: opening,
      interestPaid: interest,
      principalPaid: principal,
      overpaymentPaid: overApplied,
      closingBalance: closing,
      annualRatePct: annual,
      scheduledPayment: payment,
      overpaymentMode: mode,
    })
  }

  return { rows, summary: buildSummary(rows, loanAmount) }
}
