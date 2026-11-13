import type * as React from 'react'
import type { ImpactDelta } from '@/core/impact'
import type { OverpaymentMode } from '@/core/types'
import { ImpactBadge } from '@/components/ui/ImpactBadge'
import { ModeSelect } from '@/components/ui/ModeSelect'

export interface EventRowMode {
  value: OverpaymentMode | undefined
  configDefault: OverpaymentMode
  onChange: (m: OverpaymentMode | undefined) => void
  ariaLabel: string
}

export interface EventRowProps {
  /** Field inputs (NumberInputs etc). Rendered in a full-width responsive grid. */
  children: React.ReactNode
  onRemove: () => void
  removeLabel: string
  /** Footer meta text, e.g. "£500 × 6 mo = £3 000". */
  meta?: React.ReactNode
  /** Optional per-event mode control. */
  mode?: EventRowMode
  /** Optional impact badge. */
  impact?: { impact: ImpactDelta; label?: string }
}

/**
 * Shared row for the overpayment event editors (regular blocks + one-off lumps).
 * Inputs fill the row width in a grid (no more cramped `w-24` lump input), a
 * compact remove button sits in the header, and a footer carries the meta text,
 * the per-event mode selector and the impact badge.
 */
export function EventRow({ children, onRemove, removeLabel, meta, mode, impact }: EventRowProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/50">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {children}
        <div className="flex items-end justify-end">
          <button
            type="button"
            aria-label={removeLabel}
            onClick={onRemove}
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            remove
          </button>
        </div>
      </div>
      {(meta || mode || impact) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {meta && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{meta}</span>
            )}
            {mode && (
              <>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Mode:</span>
                <ModeSelect
                  ariaLabel={mode.ariaLabel}
                  value={mode.value}
                  configDefault={mode.configDefault}
                  onChange={mode.onChange}
                />
              </>
            )}
          </div>
          {impact && <ImpactBadge impact={impact.impact} label={impact.label} />}
        </div>
      )}
    </div>
  )
}
