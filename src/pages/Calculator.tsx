import { LoanSetupForm } from '@/components/editors/LoanSetupForm'
import { RateScheduleEditor } from '@/components/editors/RateScheduleEditor'
import { OverpaymentBlockEditor } from '@/components/editors/OverpaymentBlockEditor'
import { OneOffPaymentEditor } from '@/components/editors/OneOffPaymentEditor'
import { SummaryCards } from '@/components/SummaryCards'
import { Card } from '@/components/ui/Card'
import { BalanceChart } from '@/components/charts/BalanceChart'
import { FlowChart } from '@/components/charts/FlowChart'
import { ComparisonChart } from '@/components/charts/ComparisonChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { WaterfallChart } from '@/components/charts/WaterfallChart'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SavedPresets } from '@/components/SavedPresets'
import { PillButton } from '@/components/ui/PillButton'
import { PRESETS } from '@/core/presets'
import { useEffect, useMemo, useState } from 'react'
import { useMortgageStore } from '@/state/store'
import { useSimulation } from '@/state/simulation'
import { parse, serialize } from '@/core/serialize'
import type { MortgageConfig } from '@/core/types'
import { DEFAULT_CONFIG } from '@/state/store'

// The ?plan= token, parsed once per session (the URL only mutates via our own
// replaceState). Resolved into either a config to load or a list of errors
// to display; never recomputed after the first read.
const initialPlan: { config: MortgageConfig | null; errors: string[] } | null =
  typeof window !== 'undefined'
    ? (() => {
        const raw = new URLSearchParams(window.location.search).get('plan')
        if (!raw) return null
        const { config, errors } = parse(raw, DEFAULT_CONFIG)
        return { config, errors }
      })()
    : null

export function Calculator() {
  const config = useMortgageStore((s) => s.config)
  const replaceConfig = useMortgageStore((s) => s.replaceConfig)
  const { adjusted, baseline } = useSimulation()

  // Reflect state in the URL (read once on mount, write on change).
  const [urlPlanError] = useState<string[] | null>(() =>
    initialPlan && initialPlan.config === null ? initialPlan.errors : null
  )
  useEffect(() => {
    if (initialPlan && initialPlan.config !== null) {
      replaceConfig(initialPlan.config)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('plan', serialize(config))
    const url = `${window.location.pathname}?${qs.toString()}`
    window.history.replaceState(null, '', url)
  }, [config, replaceConfig])

  const activePresetId = useMemo(() => {
    const cur = serialize(config)
    for (const p of PRESETS) if (serialize(p.config) === cur) return p.id
    return null
  }, [config])

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      {urlPlanError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <p className="m-0 font-semibold">The plan in this link could not be loaded:</p>
          <ul className="my-1 ml-5 list-disc">
            {urlPlanError.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <p className="m-0 text-xs opacity-80">Showing the default plan instead.</p>
        </div>
      )}
      <header className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="m-0 text-xl font-bold tracking-tight">Mortgage calculator</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Model rate changes, overpayments and one-off lumps; see the payoff shift and interest
              saved.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Start from
          </span>
          {PRESETS.map((p) => (
            <PillButton
              key={p.id}
              variant="round"
              label={p.name}
              title={p.blurb}
              active={activePresetId === p.id}
              onClick={() => replaceConfig(p.config)}
            />
          ))}
        </div>
        <div className="mt-3">
          <SavedPresets />
        </div>
      </header>
      <SummaryCards />
      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <LoanSetupForm />
          <RateScheduleEditor />
          <OverpaymentBlockEditor />
          <OneOffPaymentEditor />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="Balance over time"
            subtitle="Remaining balance with rate step changes and one-off overpayment markers"
            height={300}
            className="md:col-span-2"
          >
            <BalanceChart result={adjusted} config={config} />
          </Card>
          <Card
            title="Cash flow by month"
            subtitle="Principal, interest and overpayments paid each month"
            height={300}
          >
            <FlowChart result={adjusted} />
          </Card>
          <Card
            title="What you paid"
            subtitle="Split of total outlay; centre shows the total paid"
            height={300}
          >
            <DonutChart summary={adjusted.summary} />
          </Card>
          <Card
            title="Baseline vs your plan"
            subtitle="How overpayments pull the balance down faster"
            height={300}
            className="md:col-span-2"
          >
            <ComparisonChart baseline={baseline} adjusted={adjusted} config={config} />
          </Card>
          <Card
            title="Overpayment waterfall"
            subtitle="Balance before each overpayment event, and how much each removes"
            height={300}
            className="md:col-span-2"
          >
            <WaterfallChart result={adjusted} config={config} />
          </Card>
        </div>
      </div>
    </div>
  )
}
