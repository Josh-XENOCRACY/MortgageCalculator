/**
 * Core domain types for the mortgage model.
 * Pure TypeScript — no React, no DOM. See PROJECT_PLAN.md §5.
 */

/**
 * How an annual rate is converted to a per-payment rate for compounding.
 * Abstracted (per plan Q3) so future modes can be added without touching the
 * engine: e.g. 'Nominal12' (APR/12 on opening balance, v1 default),
 * 'EffectiveMonthly' (APY-derived), 'Daily' etc.
 */
export interface InterestRateConvention {
  id: string
  label: string
  /** Per-month periodic rate derived from an annual rate given as a percentage (e.g. 4.25). */
  monthlyRate: (annualRatePct: number) => number
}

/** One tier of the rate schedule. */
export interface RatePeriod {
  /** 0-based month index at which this rate starts being in force. */
  startMonth: number
  /** Annual rate, in percent, e.g. 4.25 for 4.25%. */
  annualRatePct: number
}

/** A regular overpayment applied every month in [startMonth, endMonth] inclusive. */
export interface OverpaymentBlock {
  /**
   * Stable UI identity so multiple events may coexist in the same month
   * (they are summed per month by the engine). Assigned by the store/UI; the
   * core engine never reads it.
   */
  id?: string
  startMonth: number
  endMonth: number
  /** Amount per month, currency units (GBP for v1). */
  amount: number
  /**
   * Optional per-event mode. When present, this is a *regime switch*: from
   * `startMonth` onward the engine behaves as if `MortgageConfig.overpaymentMode`
   * were set to this value (chronologically last event wins). When absent,
   * the config-level mode applies. This lets one block shorten the term while a
   * later block drops the monthly payment.
   */
  mode?: OverpaymentMode
}

/** A single one-off overpayment in a specific month. */
export interface OneOffPayment {
  /** Stable UI identity (see `OverpaymentBlock.id`); several one-offs may share a month. */
  id?: string
  month: number
  amount: number
  /** Optional per-event mode, same semantics as `OverpaymentBlock.mode`, effective from `month`. */
  mode?: OverpaymentMode
}

/** How overpayments behave. */
export type OverpaymentMode =
  | /** Payment stays fixed; payoff date moves earlier. */
    'reduce_term' /** Payoff date stays fixed; payment drops to absorb the extra. */
  | 'reduce_payment'

export interface MortgageConfig {
  /** Loan principal at start, e.g. 350_000. */
  loanAmount: number
  /** Total term in months, 1..600. */
  termMonths: number
  /** Ordered list of rate periods; rate at month m = last period with startMonth <= m.
   *  Months before the first period use the first period's rate. */
  rateSchedule: RatePeriod[]
  overpaymentBlocks: OverpaymentBlock[]
  oneOffs: OneOffPayment[]
  /** Initial overpayment regime (plan §5.5). An event's own `mode` overrides it from its start month onward. */
  overpaymentMode: OverpaymentMode
}

/** One simulated month. Monetary values in currency units; balances follow the
 *  ledger convention (whole pounds, see engine.simulate), interest at penny precision. */
export interface MonthRow {
  /** 0-based month index (month 0 = the first payment). */
  month: number
  openingBalance: number
  /** Interest charged this month. */
  interestPaid: number
  /** Principal repaid via the scheduled payment (before overpayments). */
  principalPaid: number
  /** Total overpaid (block + one-off) this month; may exceed remaining balance. */
  overpaymentPaid: number
  /** Balance after everything is applied for this month. Always >= 0. */
  closingBalance: number
  /** The annual rate (%) in force for this month. */
  annualRatePct: number
  /** The scheduled payment demanded this month (before overpayments). */
  scheduledPayment: number
  /** The overpayment regime in force this month (after any per-event regime switch). */
  overpaymentMode: OverpaymentMode
}

export interface Summary {
  /** Month index in which payoff occurs, or null if balance remains after term. */
  payoffMonth: number | null
  /** Balance actually repaid (<= loanAmount). */
  principalRepaid: number
  totalInterest: number
  /** Scheduled payments made over the plan. Note: when overpayments exist this
   *  EXCEEDS principalRepaid + totalInterest — the overpayments absorb balance
   *  that scheduled principal never needed to repay. */
  totalScheduledPaid: number
  /** Total overpayments actually applied (may be truncated at final month).
   *  Already included in `principalRepaid` (they are principal repayment). */
  totalOverpaymentsApplied: number
  /** Any balance left on the books after termMonths (balloon), >= 0. */
  balloon: number
  /** First (scheduled) monthly payment, for display. */
  firstScheduledPayment: number
  /** Largest single-month liability (scheduled + overpayments) across the plan. */
  maxMonthlyLiability: number
}

export interface SimulationResult {
  rows: MonthRow[]
  summary: Summary
}
