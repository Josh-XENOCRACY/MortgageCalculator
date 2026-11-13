import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  CanvasRenderer,
])

export type { EChartsCoreOption as ECBasicOption }

export const PALETTE = {
  brand: '#3487f5',
  principal: '#10b981',
  interest: '#f59e0b',
  overpay: '#a855f7',
  baseline: '#94a3b8',
} as const

export type IsDark = boolean

export const AXIS_COLOR = (dark: IsDark) => (dark ? '#cbd5e1' : '#475569')
export const GRID_COLOR = (dark: IsDark) =>
  dark ? 'rgba(148,163,184,0.20)' : 'rgba(100,116,139,0.16)'
export const TEXT_COLOR = (dark: IsDark) => (dark ? '#e2e8f0' : '#0f172a')

export const ANIM = {
  animationDuration: 650,
  animationDurationUpdate: 300,
  animationEasing: 'cubicOut',
  animationEasingUpdate: 'cubicOut',
  universalTransition: { enabled: true },
} as const
