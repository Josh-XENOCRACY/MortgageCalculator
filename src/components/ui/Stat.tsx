interface StatProps {
  label: string
  value: string
  hint?: string
  accent?: 'default' | 'good' | 'bad'
}

const accentClass = {
  default: 'text-slate-900 dark:text-slate-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-rose-600 dark:text-rose-400',
}

export function Stat({ label, value, hint, accent = 'default' }: StatProps) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-0.5 font-semibold tabular-nums ${accentClass[accent]}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  )
}
