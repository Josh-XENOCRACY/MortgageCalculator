import { useSimulation } from '@/state/simulation'
import { gbp, monthsLabel, termLabel } from '@/core/format'
import { Stat } from '@/components/ui/Stat'
import { useMortgageStore } from '@/state/store'

export function SummaryCards() {
  const { adjusted, baseline, impact } = useSimulation()
  const termMonths = useMortgageStore((s) => s.config.termMonths)
  const s = adjusted.summary
  const b = baseline.summary
  const hasOverpayments = impact.interestSaved !== 0 || impact.monthsSaved !== 0
  const maxScheduled = adjusted.rows.reduce((mx, r) => Math.max(mx, r.scheduledPayment), 0)
  const paymentStepsUp = maxScheduled > s.firstScheduledPayment + 0.01

  const payoffValue =
    s.payoffMonth === null
      ? `balloon ${gbp(s.balloon)}`
      : s.payoffMonth === termMonths - 1
        ? termLabel(termMonths)
        : `${termLabel(termMonths)} → ${termLabel((s.payoffMonth ?? 0) + 1)}`

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <Stat
        label="Monthly payment"
        value={s.firstScheduledPayment ? gbp(s.firstScheduledPayment, true) : '—'}
        hint={
          paymentStepsUp
            ? `up to ${gbp(maxScheduled, true)}/mo after rate steps`
            : s.maxMonthlyLiability > s.firstScheduledPayment + 0.01
              ? `up to ${gbp(s.maxMonthlyLiability, true)} in overpayment months`
              : undefined
        }
      />
      <Stat
        label="Payoff"
        value={payoffValue}
        hint={
          s.payoffMonth === null
            ? 'not fully paid by end of term'
            : impact.monthsSaved > 0
              ? `${monthsLabel(impact.monthsSaved)} earlier than planned`
              : 'right at the end of term'
        }
      />
      <Stat
        label="Total interest"
        value={gbp(s.totalInterest)}
        hint={hasOverpayments ? `baseline ${gbp(b.totalInterest)}` : undefined}
      />
      <Stat
        label="Total overpaid"
        value={gbp(s.totalOverpaymentsApplied)}
        accent={hasOverpayments ? 'good' : 'default'}
      />
      {hasOverpayments ? (
        <>
          <Stat
            label="Interest saved"
            value={`− ${gbp(Math.abs(impact.interestSaved))}`}
            accent="good"
            hint="vs no overpayments"
          />
          <Stat
            label="Term saved"
            value={impact.monthsSaved > 0 ? `− ${monthsLabel(impact.monthsSaved)}` : '—'}
            accent="good"
            hint="vs no overpayments"
          />
        </>
      ) : (
        <div className="col-span-2 sm:col-span-3 xl:col-span-2 flex items-center rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          Add rate changes or overpayments to see their impact vs the baseline.
        </div>
      )}
    </div>
  )
}
