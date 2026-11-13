import type {
  MortgageConfig,
  OneOffPayment,
  OverpaymentBlock,
  OverpaymentMode,
  RatePeriod,
} from './types'

const MODES: readonly OverpaymentMode[] = ['reduce_term', 'reduce_payment']

type Row = Record<string, unknown>

function numberIn(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (v < min || v > max) return null
  return v
}

function rateFrom(p: unknown, t: number): RatePeriod | null {
  if (typeof p !== 'object' || p === null) return null
  const r = p as Row
  const rate = numberIn(r.annualRatePct, 0, 100)
  const sm = numberIn(r.startMonth, 0, t - 1)
  if (rate === null || sm === null) return null
  return { startMonth: Math.floor(sm), annualRatePct: rate }
}

function blockFrom(b: unknown, t: number): OverpaymentBlock | null {
  if (typeof b !== 'object' || b === null) return null
  const r = b as Row
  const amount = numberIn(r.amount, 1, 10_000_000)
  const s = numberIn(r.startMonth, 0, t - 1)
  const e = numberIn(r.endMonth, 0, t - 1)
  if (amount === null || s === null || e === null) return null
  const start = Math.floor(s)
  const end = Math.floor(e)
  if (start > end) return null
  if (r.mode !== undefined && !MODES.includes(r.mode as OverpaymentMode)) return null
  const out: OverpaymentBlock = { startMonth: start, endMonth: end, amount }
  if (typeof r.id === 'string' && r.id !== '') out.id = r.id
  if (r.mode !== undefined) out.mode = r.mode as OverpaymentMode
  return out
}

function oneOffFrom(o: unknown, t: number): OneOffPayment | null {
  if (typeof o !== 'object' || o === null) return null
  const r = o as Row
  const amount = numberIn(r.amount, 1, 10_000_000)
  const month = numberIn(r.month, 0, t - 1)
  if (amount === null || month === null) return null
  if (r.mode !== undefined && !MODES.includes(r.mode as OverpaymentMode)) return null
  const out: OneOffPayment = { month: Math.floor(month), amount }
  if (typeof r.id === 'string' && r.id !== '') out.id = r.id
  if (r.mode !== undefined) out.mode = r.mode as OverpaymentMode
  return out
}

/**
 * Runtime validation for a `MortgageConfig` coming from an untrusted source
 * (URL, or a record read from localStorage written by an older version).
 *
 * Returns `null` on any shape mismatch so the caller can fall back. Out-of-range
 * months never occur because every event is range-checked against the term.
 */
export function validateConfig(raw: unknown): MortgageConfig | null {
  if (typeof raw !== 'object' || raw === null) return null
  const c = raw as Row

  if (typeof c.loanAmount !== 'number' || c.loanAmount < 0) return null
  if (typeof c.termMonths !== 'number' || c.termMonths < 1) return null
  const mode = c.overpaymentMode
  if (mode !== 'reduce_term' && mode !== 'reduce_payment') return null
  if (
    !Array.isArray(c.rateSchedule) ||
    !Array.isArray(c.overpaymentBlocks) ||
    !Array.isArray(c.oneOffs)
  ) {
    return null
  }

  const t = Math.floor(c.termMonths)
  const rateSchedule: RatePeriod[] = []
  for (const p of c.rateSchedule) {
    const r = rateFrom(p, t)
    if (r === null) return null
    rateSchedule.push(r)
  }
  const overpaymentBlocks: OverpaymentBlock[] = []
  for (const b of c.overpaymentBlocks) {
    const blk = blockFrom(b, t)
    if (blk === null) return null
    overpaymentBlocks.push(blk)
  }
  const oneOffs: OneOffPayment[] = []
  for (const o of c.oneOffs) {
    const one = oneOffFrom(o, t)
    if (one === null) return null
    oneOffs.push(one)
  }

  return {
    loanAmount: c.loanAmount,
    termMonths: t,
    rateSchedule,
    overpaymentBlocks,
    oneOffs,
    overpaymentMode: mode,
  }
}
