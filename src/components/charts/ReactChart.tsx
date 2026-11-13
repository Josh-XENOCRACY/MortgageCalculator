import ReactECharts, { type EChartsReactProps } from 'echarts-for-react'
import type { ECBasicOption } from './theme'

const baseProps: Omit<EChartsReactProps, 'option'> = {
  notMerge: false,
  lazyUpdate: true,
  style: { height: '100%', width: '100%' },
  opts: { renderer: 'canvas' },
}

/** Thin wrapper: canonical animation + a stable canvas, no re-init on data change. */
export function ReactChart({ option, ...rest }: { option: ECBasicOption } & Partial<Omit<EChartsReactProps, 'option'>>) {
  return <ReactECharts option={option} {...baseProps} {...rest} />
}
