import type { MonthRow } from '@/core/types'
import { fmtFullGBP } from '@/core/format'

/** Month axis on a value scale — shared by the time-series charts. */
export function monthAxis(gridLine: string, textColor: string, maxMonth: number): object {
  return {
    type: 'value',
    min: 0,
    max: maxMonth,
    axisLine: { lineStyle: { color: gridLine } },
    splitLine: { lineStyle: { color: gridLine } },
    axisLabel: { color: textColor, formatter: (m: number) => `yr ${Math.floor(m / 12)}` },
  }
}

export interface TooltipParamLike {
  seriesName?: string
  dataIndex: number
  value?: [number, number] | number
}

/**
 * Shared "axis" tooltip body for the time-series charts: resolves the month
 * from the [month, value] payload (authoritative for a value x-axis),
 * lists each series value, and appends the scheduled + total paid figures
 * from the row. `fmt` customises the per-series value (e.g. `Rate` as %).
 */
export function axisTooltip(
  params: TooltipParamLike[],
  rows: MonthRow[],
  fmt: (seriesName: string, v: number) => string = (name, v) =>
    `${name === 'Rate' ? `${v}%` : fmtFullGBP(v)}`
): string {
  if (!Array.isArray(params) || params.length === 0) return ''
  const first = params[0]
  const month = Array.isArray(first.value) ? (first.value[0] ?? first.dataIndex) : first.dataIndex
  const row = rows.find((r) => r.month === month)
  let out = `Month ${month} <span style="opacity:.65">(year ${Math.floor(month / 12)})</span>`
  for (const p of params) {
    if (!p.seriesName) continue
    const v = Array.isArray(p.value) ? p.value[1] : (p.value as number)
    out += `<br/>&nbsp;&nbsp;${fmt(p.seriesName, v)}`
  }
  if (row) {
    const actual = row.scheduledPayment + row.overpaymentPaid
    out += `<br/>&nbsp;&nbsp;Scheduled payment: ${fmtFullGBP(row.scheduledPayment)}`
    out += `<br/>&nbsp;&nbsp;Total paid this month: ${fmtFullGBP(actual)}`
  }
  return out
}
