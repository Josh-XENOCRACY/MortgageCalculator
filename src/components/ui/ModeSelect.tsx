import type { OverpaymentMode } from '@/core/types'
import { PillButton } from '@/components/ui/PillButton'

export interface ModeSelectProps {
  /** Current mode. undefined means "inherit config-level default". */
  value: OverpaymentMode | undefined
  onChange: (mode: OverpaymentMode | undefined) => void
  /**
   * The config-level default mode. Used only to label the "Inherit" option
   * (so users know what's inherited) and to render an active pill when the
   * current value matches the default.
   */
  configDefault: OverpaymentMode
  /** Accessible label, e.g. "event mode". */
  ariaLabel: string
}

/**
 * A compact three-way mode selector. "Inherit" clears the per-event mode and
 * defers to `MortgageConfig.overpaymentMode`. Useful in overpayment event
 * rows where the mode can vary per event (see types.OverpaymentBlock.mode).
 */
export function ModeSelect({ value, onChange, configDefault, ariaLabel }: ModeSelectProps) {
  const inheritLabel =
    configDefault === 'reduce_term' ? 'Inherit (reduce term)' : 'Inherit (reduce payment)'
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-1">
      <PillButton
        label={inheritLabel}
        active={value === undefined}
        onClick={() => onChange(undefined)}
      />
      <PillButton
        label="Reduce term"
        active={value === 'reduce_term'}
        onClick={() => onChange('reduce_term')}
      />
      <PillButton
        label="Reduce payment"
        active={value === 'reduce_payment'}
        onClick={() => onChange('reduce_payment')}
      />
    </div>
  )
}
