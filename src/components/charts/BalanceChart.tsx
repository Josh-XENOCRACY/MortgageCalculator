import { useMemo } from 'react'
import type { ECBasicOption } from './theme'
import { ANIM, AXIS_COLOR, GRID_COLOR, PALETTE } from './theme'
import type { MortgageConfig, SimulationResult } from '@/core/types'
import { rateAtMonth, sortedSchedule } from '@/core/rate'
import { fmtCompactGBP, round2 } from '@/core/format'
import { useDark } from './useDark'
import { ReactChart } from './ReactChart'
import { axisTooltip, monthAxis } from './shared'

interface Props {
  result: SimulationResult
  config: MortgageConfig
}

const rateFmt = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

/** Rate in force at each month, sampled from the authoritative resolver. */
function rateStepData(config: MortgageConfig): [number, number][] {
  const sorted = sortedSchedule(config)
  return Array.from({ length: config.termMonths }, (_, m) => [m, rateAtMonth(sorted, m)])
}

export function buildBalanceOption({ result, config }: Props, dark: boolean): ECBasicOption {
  const balance = result.rows.map((r) => [r.month, round2(r.closingBalance)])
  const rateData = rateStepData(config)
  const oneOffMarks = config.oneOffs.map((o) => o.month)
  const zoom = config.termMonths > 120

  return {
    ...ANIM,
    backgroundColor: 'transparent',
    legend: {
      show: true,
      top: 0,
      textStyle: { color: AXIS_COLOR(dark), fontSize: 11 },
      data: ['Balance', 'Rate'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: unknown) => axisTooltip(params as never, result.rows),
    },
    grid: { left: 8, right: 48, top: 30, bottom: zoom ? 44 : 12, containLabel: true },
    xAxis: monthAxis(GRID_COLOR(dark), AXIS_COLOR(dark), config.termMonths - 1),
    yAxis: [
      {
        type: 'value',
        min: 0,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: GRID_COLOR(dark) } },
        axisLabel: { color: AXIS_COLOR(dark), formatter: (v: number) => fmtCompactGBP(v) },
      },
      {
        type: 'value',
        min: 0,
        max: Math.max(1, ...config.rateSchedule.map((p) => p.annualRatePct)) * 1.15,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: AXIS_COLOR(dark), formatter: (v: number) => `${rateFmt.format(v)}%` },
      },
    ],
    dataZoom: zoom
      ? [
          { type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true },
          { type: 'slider', xAxisIndex: 0, height: 18, bottom: 8 },
        ]
      : [],
    series: [
      {
        name: 'Balance',
        type: 'line',
        smooth: 0.2,
        yAxisIndex: 0,
        showSymbol: false,
        data: balance,
        lineStyle: { color: PALETTE.brand, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: dark ? 'rgba(52,135,245,0.35)' : 'rgba(52,135,245,0.22)' },
              { offset: 1, color: 'rgba(52,135,245,0.0)' },
            ],
          },
        },
        markLine:
          oneOffMarks.length > 0
            ? {
                symbol: 'none',
                silent: true,
                label: { show: false },
                data: oneOffMarks.map((x) => ({
                  xAxis: x,
                  lineStyle: { color: PALETTE.principal, type: 'dashed' as const, width: 1 },
                })),
              }
            : undefined,
      },
      {
        name: 'Rate',
        type: 'line',
        step: 'end',
        yAxisIndex: 1,
        showSymbol: true,
        symbolSize: 5,
        data: rateData,
        lineStyle: { color: PALETTE.overpay, width: 1.5 },
        itemStyle: { color: PALETTE.overpay },
      },
    ],
  }
}

export function BalanceChart({ result, config }: Props) {
  const dark = useDark()
  const option = useMemo(() => buildBalanceOption({ result, config }, dark), [result, config, dark])
  return <ReactChart option={option} />
}
