import { useMemo } from 'react'
import type { ECBasicOption } from './theme'
import { ANIM, AXIS_COLOR, GRID_COLOR, PALETTE, TEXT_COLOR } from './theme'
import { buildWaterfallBars, type WaterfallBar } from '@/core/waterfall'
import { fmtCompactGBP, fmtFullGBP } from '@/core/format'
import type { MortgageConfig, SimulationResult } from '@/core/types'
import { useDark } from './useDark'
import { ReactChart } from './ReactChart'

interface Props {
  result: SimulationResult
  config: MortgageConfig
}

export function buildWaterfallOption({ config, result }: Props, dark: boolean): ECBasicOption {
  const bar: WaterfallBar[] = buildWaterfallBars(config, result)
  // Size bars to fit the chart comfortably regardless of how many events there
  // are: small set → cap width, large set → shrink so labels + gaps still fit.
  const barMaxWidth = Math.max(12, Math.min(46, 380 / Math.max(2, bar.length)))

  if (bar.length === 0) {
    return {
      ...ANIM,
      backgroundColor: 'transparent',
      title: {
        text: 'Add an overpayment',
        subtext: 'Add a one-off or a regular overpayment to see how it shaves the balance.',
        left: 'center',
        top: 'middle',
        textStyle: { color: TEXT_COLOR(dark), fontSize: 13 },
        subtextStyle: { color: AXIS_COLOR(dark), fontSize: 11 },
      },
    }
  }

  return {
    ...ANIM,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      position: 'top' as const,
      formatter: (params: Array<{ dataIndex: number }>) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const b = bar[params[0].dataIndex]
        return `${b.label}<br/>Before: ${fmtFullGBP(b.base)}<br/>Removed: ${fmtFullGBP(b.amount)}<br/>After: ${fmtFullGBP(b.end)}`
      },
    },
    grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: bar.map((b) => b.label),
      axisLine: { lineStyle: { color: GRID_COLOR(dark) } },
      axisTick: { show: false },
      axisLabel: { color: AXIS_COLOR(dark), fontSize: 10, interval: 0, rotate: 14 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: GRID_COLOR(dark) } },
      axisLabel: { color: AXIS_COLOR(dark), formatter: (v: number) => fmtCompactGBP(v) },
    },
    series: [
      {
        type: 'bar',
        data: bar.map((b) => b.base),
        stack: 'wf',
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
        silent: true,
        barMaxWidth,
      },
      {
        type: 'bar',
        data: bar.map((b) => b.amount),
        stack: 'wf',
        itemStyle: {
          color: (p: { dataIndex: number }) =>
            p.dataIndex === bar.length - 1 ? PALETTE.principal : PALETTE.overpay,
        },
        barMaxWidth,
        label: {
          show: true,
          position: 'top' as const,
          distance: 4,
          color: AXIS_COLOR(dark),
          fontSize: 10,
          formatter: (p: { dataIndex: number }) => `-${fmtCompactGBP(bar[p.dataIndex].amount)}`,
        },
      },
    ],
  }
}

export function WaterfallChart({ result, config }: Props) {
  const dark = useDark()
  const option = useMemo(
    () => buildWaterfallOption({ result, config }, dark),
    [result, config, dark]
  )
  return <ReactChart option={option} />
}
