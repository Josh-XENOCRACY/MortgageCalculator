import { monthsLabel } from '@/core/format'
import type { RatePeriod } from '@/core/types'
import { useMortgageStore } from '@/state/store'
import { Card } from '@/components/ui/Card'
import { NumberInput } from '@/components/ui/NumberInput'

interface RowProps {
  period: RatePeriod
  canRemove: boolean
  onRemove: () => void
  onUpsert: (p: RatePeriod) => void
}

/**
 * A rate-tier row: just the month and the APR, plus a remove control. Rates are
 * external inputs (lender decisions) that the borrower can't influence, so
 * deliberately no impact/savings badge is shown here — unlike the overpayment
 * event editors, where the badge reflects a choice the user actually makes.
 */
function RateRow({ period, canRemove, onRemove, onUpsert }: RowProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <NumberInput
          label="from month"
          value={period.startMonth}
          onCommit={(m) => onUpsert({ ...period, startMonth: m })}
          min={0}
          delayMs={0}
        />
        <NumberInput
          label="APR %"
          value={period.annualRatePct}
          onCommit={(r) => onUpsert({ ...period, annualRatePct: r })}
          min={0}
          max={100}
          step={0.01}
          delayMs={0}
        />
        <div className="flex items-end justify-end">
          <button
            type="button"
            aria-label={`Remove rate from month ${period.startMonth}`}
            disabled={!canRemove}
            onClick={onRemove}
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-600 disabled:opacity-30 dark:hover:text-rose-400"
          >
            remove
          </button>
        </div>
      </div>
    </div>
  )
}

export function RateScheduleEditor() {
  const config = useMortgageStore((s) => s.config)
  const upsertRatePeriod = useMortgageStore((s) => s.upsertRatePeriod)
  const removeRatePeriod = useMortgageStore((s) => s.removeRatePeriod)

  const addPeriod = () => {
    const last = config.rateSchedule[config.rateSchedule.length - 1]
    const next = last ? Math.min(last.startMonth + 24, config.termMonths - 1) : 0
    upsertRatePeriod(next, { startMonth: next, annualRatePct: last ? last.annualRatePct : 4.5 })
  }

  return (
    <Card
      title="Rate schedule"
      subtitle="Step the APR at any month"
      actions={
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {config.rateSchedule.length} period{config.rateSchedule.length === 1 ? '' : 's'}
        </span>
      }
    >
      <div className="space-y-2">
        {config.rateSchedule.map((p) => (
          <RateRow
            key={p.startMonth}
            period={p}
            canRemove={config.rateSchedule.length > 1}
            onRemove={() => removeRatePeriod(p.startMonth)}
            onUpsert={(v) => upsertRatePeriod(p.startMonth, v)}
          />
        ))}
        <button
          type="button"
          onClick={addPeriod}
          className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          + add rate period
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Each rate holds until the next one starts. A mid-term step re-amortises the payment to
          keep the end date. (Rates are lender-set inputs — the app models their effect on your
          payment, but doesn't show per-tier savings, since you don't control them. Term runs to{' '}
          {monthsLabel(config.termMonths)}.)
        </p>
      </div>
    </Card>
  )
}
