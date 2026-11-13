import { useMemo } from 'react'
import type { ECBasicOption } from './theme'
import { ANIM, AXIS_COLOR, GRID_COLOR, PALETTE } from './theme'
import type { MortgageConfig, SimulationResult } from '@/core/types'
import { fmtCompactGBP, fmtFullGBP, round2 } from '@/core/format'
import { useDark } from './useDark'
import { ReactChart } from './ReactChart'
import { monthAxis } from './shared'

interface Props {
  baseline: SimulationResult
  adjusted: SimulationResult
  config: MortgageConfig
}

export function buildComparisonOption(
  { baseline, adjusted, config }: Props,
  dark: boolean
): ECBasicOption {
  const base = baseline.rows.map((r) => [r.month, round2(r.closingBalance)])
  const adj = adjusted.rows.map((r) => [r.month, round2(r.closingBalance)])
  const zoom = config.termMonths > 120
  const maxMonth = Math.max(config.termMonths, baseline.rows.length, adjusted.rows.length) - 1

  return {
    ...ANIM,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      top: 0,
      textStyle: { color: AXIS_COLOR(dark), fontSize: 11 },
      data: ['Baseline (no overpayments)', 'Adjusted (your plan)'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      valueFormatter: (v: number | [number, number]) =>
        Array.isArray(v) ? fmtFullGBP(v[1]) : fmtFullGBP(v),
    },
    grid: { left: 8, right: 16, top: 30, bottom: zoom ? 44 : 12, containLabel: true },
    xAxis: monthAxis(GRID_COLOR(dark), AXIS_COLOR(dark), maxMonth),
    yAxis: {
      type: 'value',
      min: 0,
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
      {
        name: 'Baseline (no overpayments)',
        type: 'line',
        showSymbol: false,
        data: base,
        lineStyle: { color: PALETTE.baseline, width: 2, type: 'dashed' },
      },
      {
        name: 'Adjusted (your plan)',
        type: 'line',
        showSymbol: false,
        data: adj,
        lineStyle: { color: PALETTE.brand, width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: dark ? 'rgba(52,135,245,0.20)' : 'rgba(52,135,245,0.12)' },
              { offset: 1, color: 'rgba(52,135,245,0.0)' },
            ],
          },
        },
      },
    ],
  }
}

export function ComparisonChart({ baseline, adjusted, config }: Props) {
  const dark = useDark()
  const option = useMemo(
    () => buildComparisonOption({ baseline, adjusted, config }, dark),
    [baseline, adjusted, config, dark]
  )
  return <ReactChart option={option} />
}
