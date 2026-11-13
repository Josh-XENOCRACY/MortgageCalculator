import { useMemo } from 'react'
import { MAX_AMOUNT } from '@/core/serialize'
import { gbp } from '@/core/format'
import { impactOfEvent } from '@/core/eventImpact'
import type { OverpaymentBlock } from '@/core/types'
import { useMortgageStore } from '@/state/store'
import { Card } from '@/components/ui/Card'
import { NumberInput } from '@/components/ui/NumberInput'
import { EventRow } from './EventRow'

interface RowProps {
  block: OverpaymentBlock
  onRemove: () => void
  onUpsert: (b: OverpaymentBlock) => void
}

function BlockRow({ block, onRemove, onUpsert }: RowProps) {
  const config = useMortgageStore((s) => s.config)

  // Identity is the stable `id` (assigned by the store), so an event's marginal
  // impact removes exactly this event even when others sit in the same months.
  const impact = useMemo(
    () =>
      impactOfEvent(config, (c) => ({
        ...c,
        overpaymentBlocks: c.overpaymentBlocks.filter((b) => b.id !== block.id),
      })),
    [config, block.id]
  )

  const months = block.endMonth - block.startMonth + 1
  const total = block.amount * months

  return (
    <EventRow
      onRemove={onRemove}
      removeLabel={`Remove overpayment from month ${block.startMonth}`}
      meta={`${gbp(block.amount)} × ${months} mo = ${gbp(total)}`}
      mode={{
        value: block.mode,
        configDefault: config.overpaymentMode,
        ariaLabel: 'overpayment block mode',
        onChange: (m) =>
          onUpsert(m === undefined ? { ...block, mode: undefined } : { ...block, mode: m }),
      }}
      impact={{ impact, label: 'vs no block' }}
    >
      <NumberInput
        label="from month"
        value={block.startMonth}
        onCommit={(m) => onUpsert({ ...block, startMonth: m })}
        min={0}
        delayMs={0}
      />
      <NumberInput
        label="to month"
        value={block.endMonth}
        onCommit={(m) => onUpsert({ ...block, endMonth: m })}
        min={0}
        delayMs={0}
      />
      <NumberInput
        label="per month"
        prefix="£"
        value={block.amount}
        onCommit={(a) => onUpsert({ ...block, amount: a })}
        min={1}
        max={MAX_AMOUNT}
        delayMs={0}
      />
    </EventRow>
  )
}

export function OverpaymentBlockEditor() {
  const config = useMortgageStore((s) => s.config)
  const upsert = useMortgageStore((s) => s.upsertOverpaymentBlock)
  const remove = useMortgageStore((s) => s.removeOverpaymentBlock)

  const addBlock = () => {
    const last = config.overpaymentBlocks[config.overpaymentBlocks.length - 1]
    const start = last ? Math.min(last.endMonth + 1, config.termMonths - 1) : 0
    const end = Math.min(start + 35, config.termMonths - 1)
    upsert(crypto.randomUUID(), { startMonth: start, endMonth: end, amount: 200 })
  }

  return (
    <Card title="Regular overpayments" subtitle="A monthly amount over a range">
      <div className="space-y-2">
        {config.overpaymentBlocks.map((b) => (
          <BlockRow
            key={b.id}
            block={b}
            onRemove={() => remove(b.id as string)}
            onUpsert={(v) => upsert((b.id as string) ?? crypto.randomUUID(), v)}
          />
        ))}
        <button
          type="button"
          onClick={addBlock}
          className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          + add regular overpayment
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Applied every month from start to end inclusive. The mode row on each event lets it use
          the config-level default or override with Reduce term / Reduce payment.
        </p>
      </div>
    </Card>
  )
}
