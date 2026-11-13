import type { MortgageConfig, OverpaymentMode } from './types'

const MODE_TOKEN: Record<OverpaymentMode, string> = {
  reduce_term: 'rt',
  reduce_payment: 'rp',
}

export interface ParseResult {
  config: MortgageConfig | null
  errors: string[]
}

export const MIN_TERM = 1
export const MAX_TERM = 600
export const MAX_AMOUNT = 10_000_000
const MAX_RATE = 100

function toNum(v: string): number | null {
  if (v === '' || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * If a trailing ":rt" / ":rp" mode token is present, strip it and return the
 * mode. Returns 'BAD' when an unrecognised token is found so callers can reject
 * the whole segment (e.g. "500@0-10:xx").
 */
function splitModeToken(range: string): { range: string; mode?: OverpaymentMode } | 'BAD' {
  const colon = range.lastIndexOf(':')
  if (colon === -1) return { range, mode: undefined }
  const token = range.slice(colon + 1)
  const mode: OverpaymentMode | undefined =
    token === MODE_TOKEN.reduce_term
      ? 'reduce_term'
      : token === MODE_TOKEN.reduce_payment
        ? 'reduce_payment'
        : undefined
  if (mode === undefined) return 'BAD'
  return { range: range.slice(0, colon), mode }
}

export function serialize(config: MortgageConfig): string {
  const parts: string[] = [
    `amount=${Math.round(config.loanAmount)}`,
    `term=${config.termMonths}`,
    `mode=${config.overpaymentMode}`,
  ]
  if (config.rateSchedule.length > 0) {
    const r = [...config.rateSchedule]
      .sort((a, b) => a.startMonth - b.startMonth)
      .map((p) => `${p.annualRatePct}@${p.startMonth}`)
    parts.push(`r=${r.join(',')}`)
  }
  if (config.overpaymentBlocks.length > 0) {
    const ob = config.overpaymentBlocks.map((b) => {
      const suffix = b.mode ? `:${MODE_TOKEN[b.mode]}` : ''
      return `${b.amount}@${b.startMonth}-${b.endMonth}${suffix}`
    })
    parts.push(`ob=${ob.join(',')}`)
  }
  if (config.oneOffs.length > 0) {
    const op = config.oneOffs.map((o) => {
      const suffix = o.mode ? `:${MODE_TOKEN[o.mode]}` : ''
      return `${o.amount}@${o.month}${suffix}`
    })
    parts.push(`op=${op.join(',')}`)
  }
  return parts.join('&')
}

export function parse(input: string, defaults: MortgageConfig): ParseResult {
  const errors: string[] = []
  const config: MortgageConfig = structuredClone(defaults)
  let term = config.termMonths

  const clampMonth = (v: number, t: number): number => Math.max(0, Math.min(t - 1, Math.floor(v)))

  for (const pair of input.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq === -1) {
      errors.push(`Unrecognised segment "${pair}"`)
      continue
    }
    const key = pair.slice(0, eq)
    const raw = decodeURIComponent(pair.slice(eq + 1))

    switch (key) {
      case 'amount': {
        const n = toNum(raw)
        if (n === null || n < 0 || n > MAX_AMOUNT) errors.push(`amount: "${raw}" is not valid`)
        else config.loanAmount = n
        break
      }
      case 'term': {
        const n = toNum(raw)
        if (n === null || n < MIN_TERM || n > MAX_TERM) {
          errors.push(`term: must be between ${MIN_TERM} and ${MAX_TERM} months`)
        } else {
          term = Math.floor(n)
          config.termMonths = term
        }
        break
      }
      case 'mode': {
        if (raw === 'reduce_term' || raw === 'reduce_payment') config.overpaymentMode = raw
        else errors.push('mode: must be reduce_term or reduce_payment')
        break
      }
      case 'r': {
        if (!raw) break
        const good: { annualRatePct: number; startMonth: number }[] = []
        const bad: string[] = []
        for (const seg of raw.split(',')) {
          const at = seg.indexOf('@')
          const rate = toNum(at === -1 ? seg : seg.slice(0, at))
          const month = toNum(at === -1 ? '0' : seg.slice(at + 1))
          if (rate === null || month === null || rate < 0 || rate > MAX_RATE) {
            bad.push(seg)
            continue
          }
          good.push({ annualRatePct: rate, startMonth: clampMonth(month, term) })
        }
        if (bad.length > 0) errors.push(`rates: ${bad.join(', ')} could not be parsed`)
        if (good.length > 0) {
          good.sort((a, b) => a.startMonth - b.startMonth)
          config.rateSchedule = good
        }
        break
      }
      case 'ob': {
        if (!raw) break
        const good: {
          amount: number
          startMonth: number
          endMonth: number
          mode?: OverpaymentMode
        }[] = []
        const bad: string[] = []
        for (const seg of raw.split(',')) {
          const at = seg.indexOf('@')
          const amount = toNum(at === -1 ? seg : seg.slice(0, at))
          const withMode = splitModeToken(at === -1 ? '' : seg.slice(at + 1))
          if (withMode === 'BAD') {
            bad.push(seg)
            continue
          }
          const range = withMode.range
          const mode = withMode.mode
          const dash = range.indexOf('-')
          if (dash === -1) {
            bad.push(seg)
            continue
          }
          const a = toNum(range.slice(0, dash))
          const b = toNum(range.slice(dash + 1))
          if (amount === null || amount <= 0 || amount > MAX_AMOUNT || a === null || b === null) {
            bad.push(seg)
            continue
          }
          const start = clampMonth(a, term)
          const end = clampMonth(b, term)
          good.push({
            amount,
            startMonth: start,
            endMonth: Math.max(start, end),
            ...(mode !== undefined ? { mode } : {}),
          })
        }
        if (bad.length > 0) errors.push(`overpayment blocks: ${bad.join(', ')} could not be parsed`)
        if (good.length > 0) config.overpaymentBlocks = good
        break
      }
      case 'op': {
        if (!raw) break
        const good: { amount: number; month: number; mode?: OverpaymentMode }[] = []
        const bad: string[] = []
        for (const seg of raw.split(',')) {
          const at = seg.indexOf('@')
          const amount = toNum(at === -1 ? seg : seg.slice(0, at))
          const withMode = splitModeToken(at === -1 ? '-1' : seg.slice(at + 1))
          if (withMode === 'BAD') {
            bad.push(seg)
            continue
          }
          const rangeText = withMode.range
          const mode = withMode.mode
          const month = toNum(rangeText)
          if (amount === null || amount <= 0 || amount > MAX_AMOUNT || month === null) {
            bad.push(seg)
            continue
          }
          good.push({
            amount,
            month: clampMonth(month, term),
            ...(mode !== undefined ? { mode } : {}),
          })
        }
        if (bad.length > 0) errors.push(`one-off payments: ${bad.join(', ')} could not be parsed`)
        if (good.length > 0) config.oneOffs = good
        break
      }
      default:
        errors.push(`Unknown parameter "${key}"`)
    }
  }

  config.rateSchedule = [...config.rateSchedule].sort((a, b) => a.startMonth - b.startMonth)
  // Note: parsed events have no ids; identity is assigned when the config
  // enters the store (see replaceConfig → normalizeIds in eventIds.ts),
  // which keeps parse() pure and deterministic.
  return { config, errors }
}
