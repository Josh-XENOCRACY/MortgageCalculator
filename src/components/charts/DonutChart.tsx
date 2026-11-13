import { useMemo } from 'react'
import type { ECBasicOption } from './theme'
import { ANIM, PALETTE, TEXT_COLOR } from './theme'
import type { Summary } from '@/core/types'
import { fmtCompactGBP, fmtFullGBP } from '@/core/format'
import { useDark } from './useDark'
import { ReactChart } from './ReactChart'

interface Props {
  summary: Summary
}

export function buildDonutOption({ summary }: Props, dark: boolean): ECBasicOption {
  // Total cash outlay = principal repaid + interest paid. (totalScheduledPaid
  // is the sum of monthly payments, which *already include* interest — adding
  // interest on top of it double-counts. Overpayments live inside principalRepaid:
  // they merely pay the principal off earlier.)
  const principal = Math.abs(summary.principalRepaid)
  const interest = Math.abs(summary.totalInterest)
  const total = principal + interest

  const data = [
    { name: 'Principal', value: Math.round(principal) },
    { name: 'Interest', value: Math.round(interest) },
  ]

  return {
    ...ANIM,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      bottom: 0,
      textStyle: { color: TEXT_COLOR(dark), fontSize: 11 },
    },
    title: {
      text: fmtCompactGBP(total),
      subtext: 'Total paid',
      left: 'center',
      top: 'middle',
      textStyle: { color: TEXT_COLOR(dark), fontSize: 18, fontWeight: 600 },
      subtextStyle: { color: TEXT_COLOR(dark), fontSize: 11 },
    },
    tooltip: {
      trigger: 'item',
      formatter: (p: { name?: string; value?: number | [number, number]; percent?: number }) => {
        const v = Array.isArray(p.value) ? p.value[1] : (p.value as number)
        const pct = typeof p.percent === 'number' ? ` (${p.percent}%)` : ''
        return `${p.name}: ${fmtFullGBP(v)}${pct}`
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['55%', '78%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        show: false,
        label: { show: false },
        itemStyle: { borderColor: dark ? '#0f172a' : '#ffffff', borderWidth: 2 },
        data,
        color: [PALETTE.principal, PALETTE.interest],
      },
    ],
  }
}

export function DonutChart({ summary }: Props) {
  const dark = useDark()
  const option = useMemo(() => buildDonutOption({ summary }, dark), [summary, dark])
  return <ReactChart option={option} />
}
