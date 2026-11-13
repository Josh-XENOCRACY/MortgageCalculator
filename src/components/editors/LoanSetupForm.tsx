import { useState } from 'react'
import { useMortgageStore } from '@/state/store'
import { MAX_AMOUNT, MAX_TERM, MIN_TERM } from '@/core/serialize'
import { gbp, termLabel } from '@/core/format'
import { Card } from '@/components/ui/Card'
import { NumberInput } from '@/components/ui/NumberInput'
import { PillButton } from '@/components/ui/PillButton'

interface TermPairProps {
  termMonths: number
  onChange: (termMonths: number) => void
}

export function termToParts(termMonths: number): { years: number; months: number } {
  return { years: Math.floor(termMonths / 12), months: termMonths % 12 }
}

export function partsToTerm(years: number, months: number): number {
  return Math.max(MIN_TERM, Math.min(MAX_TERM, Math.round(years) * 12 + Math.round(months)))
}

/**
 * Linked years / months / total-months inputs. The canonical value is
 * `termMonths`; the years and months fields always show the canonical split.
 * Editing any one of them recomputes the canonical total from that field
 * combined with the current canonical value of the others.
 */
export function TermPair({ termMonths, onChange }: TermPairProps) {
  const canonical = termToParts(termMonths)

  const handleYears = (raw: string) => {
    const y = Number(raw)
    if (Number.isNaN(y)) return
    onChange(partsToTerm(y, canonical.months))
  }
  const handleTotal = (raw: string) => {
    const t = Number(raw)
    if (Number.isNaN(t)) return
    onChange(Math.max(MIN_TERM, Math.min(MAX_TERM, Math.round(t))))
  }
  const handleMonths12 = (raw: string) => {
    const m = Number(raw)
    if (Number.isNaN(m)) return
    onChange(partsToTerm(canonical.years, m))
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Term
        </span>
        <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
          {termLabel(termMonths)}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
        <LinkedInput
          label="years"
          value={canonical.years}
          onChange={handleYears}
          min={0}
          max={50}
          allowEmpty
        />
        <span className="text-xs text-slate-400">y</span>
        <LinkedInput
          label="months"
          value={canonical.months}
          onChange={handleMonths12}
          min={0}
          max={11}
          allowEmpty
        />
        <span className="text-xs text-slate-400">m</span>
        <LinkedInput
          label="total months"
          value={termMonths}
          onChange={handleTotal}
          min={MIN_TERM}
          max={MAX_TERM}
          allowEmpty
        />
      </div>
      <span className="sr-only" aria-live="polite">
        {termMonths} months
      </span>
    </div>
  )
}

interface LinkedInputProps {
  label: string
  value: number
  onChange: (raw: string) => void
  min?: number
  max?: number
  allowEmpty?: boolean
}

function LinkedInput({ label, value, onChange, min, max, allowEmpty }: LinkedInputProps) {
  const [text, setText] = useState<string | null>(null) // null = show canonical
  return (
    <label>
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        inputMode="numeric"
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900"
        value={text ?? String(value)}
        onFocus={() => setText(String(value))}
        onBlur={() => setText(null)}
        onChange={(e) => {
          setText(e.target.value)
          if (e.target.value.trim() === '') {
            if (allowEmpty) return
          }
          onChange(e.target.value)
        }}
        {...(min !== undefined ? { min } : {})}
        {...(max !== undefined ? { max } : {})}
      />
    </label>
  )
}

export function LoanSetupForm() {
  const config = useMortgageStore((s) => s.config)
  const setLoanAmount = useMortgageStore((s) => s.setLoanAmount)
  const setTermMonths = useMortgageStore((s) => s.setTermMonths)
  const setMode = useMortgageStore((s) => s.setMode)

  return (
    <Card
      title="Loan setup"
      subtitle="Principal, term and how overpayments behave"
      actions={
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {gbp(config.loanAmount)} · {termLabel(config.termMonths)}
        </span>
      }
    >
      <div className="space-y-4">
        <NumberInput
          label="Loan amount"
          prefix="£"
          value={config.loanAmount}
          onCommit={setLoanAmount}
          min={0}
          max={MAX_AMOUNT}
        />
        <TermPair termMonths={config.termMonths} onChange={setTermMonths} />
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Default overpayment mode
          </span>
          <div className="flex flex-wrap gap-2">
            <PillButton
              variant="round"
              label="Reduce term"
              active={config.overpaymentMode === 'reduce_term'}
              onClick={() => setMode('reduce_term')}
            />
            <PillButton
              variant="round"
              label="Reduce payment"
              active={config.overpaymentMode === 'reduce_payment'}
              onClick={() => setMode('reduce_payment')}
            />
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            How overpayments are absorbed. <strong>Reduce term</strong>: overpayments pay it off
            earlier. <strong>Reduce payment</strong>: end date stays fixed, payments drop. Rate
            changes always re-amortise the payment to keep the end date. Individual blocks and
            one-offs in the editors can override this.
          </p>
        </div>
      </div>
    </Card>
  )
}
