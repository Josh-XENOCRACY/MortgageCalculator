import { useMemo } from 'react'
import type { ECBasicOption } from './theme'
import { ANIM, AXIS_COLOR, GRID_COLOR, PALETTE } from './theme'
import type { SimulationResult } from '@/core/types'
import { fmtCompactGBP, round2 } from '@/core/format'
import { useDark } from './useDark'
import { ReactChart } from './ReactChart'
import { axisTooltip, monthAxis } from './shared'

interface Props {
  result: SimulationResult
}

export function buildFlowOption({ result }: Props, dark: boolean): ECBasicOption {
  const zoom = result.rows.length > 120
  const maxMonth = result.rows.length - 1

  const series = (
    name: string,
    color: string,
    pick: (r: SimulationResult['rows'][number]) => number
  ) => ({
    name,
    type: 'line' as const,
    stack: 'flow',
    areaStyle: { color, opacity: 0.5 },
    showSymbol: false,
    data: result.rows.map((r) => [r.month, round2(pick(r))]),
    lineStyle: { color, width: 1.5 },
  })

  return {
    ...ANIM,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      top: 0,
      textStyle: { color: AXIS_COLOR(dark), fontSize: 11 },
      data: ['Principal', 'Interest', 'Overpayments'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: unknown) => axisTooltip(params as never, result.rows),
    },
    grid: { left: 8, right: 16, top: 30, bottom: zoom ? 44 : 12, containLabel: true },
    xAxis: monthAxis(GRID_COLOR(dark), AXIS_COLOR(dark), maxMonth),
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: GRID_COLOR(dark) } },
      axisLabel: { color: AXIS_COLOR(dark), formatter: (v: number) => fmtCompactGBP(v) },
    },
    dataZoom: zoom
      ? [
          { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true },
          { type: 'slider', xAxisIndex: 0, height: 18, bottom: 8 },
        ]
      : [],
    series: [
      series('Principal', PALETTE.principal, (r) => r.principalPaid),
      series('Interest', PALETTE.interest, (r) => r.interestPaid),
      series('Overpayments', PALETTE.overpay, (r) => r.overpaymentPaid),
    ],
  }
}

export function FlowChart({ result }: Props) {
  const dark = useDark()
  const option = useMemo(() => buildFlowOption({ result }, dark), [result, dark])
  return <ReactChart option={option} />
}
