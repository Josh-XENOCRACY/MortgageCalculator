import type { ImpactDelta } from '@/core/impact'
import { formatImpact } from '@/core/format'

interface ImpactBadgeProps {
  impact: ImpactDelta
  label?: string
}

export function ImpactBadge({ impact, label }: ImpactBadgeProps) {
  if (impact.monthsSaved <= 0 && impact.interestSaved <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-slate-700 dark:text-slate-400">
        {label ?? 'neutral'}
      </span>
    )
  }
  const { months, interest } = formatImpact(impact)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      saves ~{months} · {interest}
    </span>
  )
}
