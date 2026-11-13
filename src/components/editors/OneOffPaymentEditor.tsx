import { useMemo } from 'react'
import { MAX_AMOUNT } from '@/core/serialize'
import { impactOfEvent } from '@/core/eventImpact'
import type { OneOffPayment } from '@/core/types'
import { useMortgageStore } from '@/state/store'
import { Card } from '@/components/ui/Card'
import { NumberInput } from '@/components/ui/NumberInput'
import { EventRow } from './EventRow'

interface RowProps {
  oneOff: OneOffPayment
  onRemove: () => void
  onUpsert: (o: OneOffPayment) => void
}

function OneOffRow({ oneOff, onRemove, onUpsert }: RowProps) {
  const config = useMortgageStore((s) => s.config)

  // Identity is the stable `id` (assigned by the store), so an event's marginal
  // impact removes exactly this event even when others sit in the same month.
  const impact = useMemo(
    () =>
      impactOfEvent(config, (c) => ({
        ...c,
        oneOffs: c.oneOffs.filter((o) => o.id !== oneOff.id),
      })),
    [config, oneOff.id]
  )

  return (
    <EventRow
      onRemove={onRemove}
      removeLabel={`Remove one-off at month ${oneOff.month}`}
      mode={{
        value: oneOff.mode,
        configDefault: config.overpaymentMode,
        ariaLabel: 'one-off payment mode',
        onChange: (m) =>
          onUpsert(m === undefined ? { ...oneOff, mode: undefined } : { ...oneOff, mode: m }),
      }}
      impact={{ impact, label: 'vs no lump' }}
    >
      <NumberInput
        label="at month"
        value={oneOff.month}
        onCommit={(m) => onUpsert({ ...oneOff, month: m })}
        min={0}
        delayMs={0}
      />
      <NumberInput
        label="lump sum"
        prefix="£"
        value={oneOff.amount}
        onCommit={(a) => onUpsert({ ...oneOff, amount: a })}
        min={1}
        max={MAX_AMOUNT}
        delayMs={0}
      />
    </EventRow>
  )
}

export function OneOffPaymentEditor() {
  const config = useMortgageStore((s) => s.config)
  const upsert = useMortgageStore((s) => s.upsertOneOff)
  const remove = useMortgageStore((s) => s.removeOneOff)

  const addOneOff = () => {
    const last = config.oneOffs[config.oneOffs.length - 1]
    const month = last ? Math.min(last.month + 12, config.termMonths - 1) : 12
    upsert(crypto.randomUUID(), { month, amount: 10_000 })
  }

  return (
    <Card title="One-off payments" subtitle="A lump sum at a specific month">
      <div className="space-y-2">
        {config.oneOffs.map((o) => (
          <OneOffRow
            key={o.id}
            oneOff={o}
            onRemove={() => remove(o.id as string)}
            onUpsert={(v) => upsert((o.id as string) ?? crypto.randomUUID(), v)}
          />
        ))}
        <button
          type="button"
          onClick={addOneOff}
          className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          + add one-off payment
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Perfect for bonus, inheritance or a large windfall. The badge shows how much term and
          interest it trims. The Mode row lets this event use the config default or override it.
        </p>
      </div>
    </Card>
  )
}
