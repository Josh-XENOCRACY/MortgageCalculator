import { create } from 'zustand'
import { normalizeIds } from '@/core/eventIds'
import { MAX_AMOUNT, MAX_TERM } from '@/core/serialize'
import type {
  MortgageConfig,
  OneOffPayment,
  OverpaymentBlock,
  OverpaymentMode,
  RatePeriod,
} from '@/core/types'

export const DEFAULT_CONFIG: MortgageConfig = {
  loanAmount: 350_000,
  termMonths: 300,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
  overpaymentBlocks: [],
  oneOffs: [],
  overpaymentMode: 'reduce_term',
}

// ----- pure config helpers (also used by the store for clamping) -----

function clampMonth(v: number, termMonths: number): number {
  return Math.max(0, Math.min(termMonths - 1, v))
}

/** Clamp any out-of-term months; drop blocks that collapse to an invalid range. */
export function clampToTerm(config: MortgageConfig): MortgageConfig {
  const t = Math.max(1, Math.floor(config.termMonths))
  const rateSchedule = config.rateSchedule.map((p) => ({
    ...p,
    startMonth: clampMonth(p.startMonth, t),
  }))
  const overpaymentBlocks = config.overpaymentBlocks
    .map((b) => ({
      ...b,
      startMonth: clampMonth(b.startMonth, t),
      endMonth: clampMonth(b.endMonth, t),
    }))
    .filter((b) => b.startMonth <= b.endMonth)
  const oneOffs = config.oneOffs.map((o) => ({
    ...o,
    month: clampMonth(o.month, t),
  }))
  return { ...config, termMonths: t, rateSchedule, overpaymentBlocks, oneOffs }
}

// ----- store -----

interface MortgageState {
  config: MortgageConfig

  setLoanAmount: (amount: number) => void
  setTermMonths: (term: number) => void
  setMode: (mode: OverpaymentMode) => void

  // `key` is the row's *current* identity (start month / month) before the edit;
  // the matching row is replaced in place even if its start month changes, so
  // moving a row to a new month never spawns a duplicate. Rate periods are
  // naturally unique per month, so a month key is sufficient there.
  upsertRatePeriod: (key: number, p: RatePeriod) => void
  removeRatePeriod: (startMonth: number) => void

  // Overpayment events are keyed by a stable `id` rather than by month, so
  // events in the *same* month are independent (the engine sums them); the
  // matching event is replaced in place even if its month changes.
  upsertOverpaymentBlock: (id: string, b: OverpaymentBlock) => void
  removeOverpaymentBlock: (id: string) => void

  upsertOneOff: (id: string, o: OneOffPayment) => void
  removeOneOff: (id: string) => void

  replaceConfig: (c: MortgageConfig) => void
  reset: () => void
}

export const useMortgageStore = create<MortgageState>((set) => ({
  config: structuredClone(DEFAULT_CONFIG),

  setLoanAmount: (amount) =>
    set((s) => ({
      config: clampToTerm({
        ...s.config,
        loanAmount: Math.max(0, Math.min(MAX_AMOUNT, amount)),
      }),
    })),

  setTermMonths: (term) =>
    set((s) => ({
      config: clampToTerm({ ...s.config, termMonths: Math.max(1, Math.min(MAX_TERM, term)) }),
    })),

  setMode: (mode) => set((s) => ({ config: { ...s.config, overpaymentMode: mode } })),

  upsertRatePeriod: (key, p) =>
    set((s) => {
      const cleaned = clampToTerm(s.config)
      const rest = cleaned.rateSchedule.filter((r) => r.startMonth !== key)
      const rateSchedule = [...rest, p].sort((a, b) => a.startMonth - b.startMonth)
      return { config: { ...cleaned, rateSchedule } }
    }),

  removeRatePeriod: (startMonth) =>
    set((s) => {
      const cleaned = clampToTerm(s.config)
      if (cleaned.rateSchedule.length <= 1) return s
      return {
        config: {
          ...cleaned,
          rateSchedule: cleaned.rateSchedule.filter((r) => r.startMonth !== startMonth),
        },
      }
    }),

  upsertOverpaymentBlock: (id, b) =>
    set((s) => {
      const cleaned = clampToTerm(s.config)
      const next: OverpaymentBlock = { ...b, id }
      const rest = cleaned.overpaymentBlocks.filter((r) => r.id !== id)
      return {
        config: {
          ...cleaned,
          overpaymentBlocks: [...rest, next].sort((a, c) => a.startMonth - c.startMonth),
        },
      }
    }),

  removeOverpaymentBlock: (id) =>
    set((s) => ({
      config: {
        ...s.config,
        overpaymentBlocks: s.config.overpaymentBlocks.filter((b) => b.id !== id),
      },
    })),

  upsertOneOff: (id, o) =>
    set((s) => {
      const cleaned = clampToTerm(s.config)
      const next: OneOffPayment = { ...o, id }
      const rest = cleaned.oneOffs.filter((r) => r.id !== id)
      return {
        config: { ...cleaned, oneOffs: [...rest, next].sort((a, c) => a.month - c.month) },
      }
    }),

  removeOneOff: (id) =>
    set((s) => ({
      config: { ...s.config, oneOffs: s.config.oneOffs.filter((o) => o.id !== id) },
    })),

  // Every external config entry point (URL load, preset chip, saved preset)
  // flows through here, so this is the single place that guarantees stable
  // per-event identity: parsed/stored events carry no `id`s until now.
  replaceConfig: (c) => set({ config: normalizeIds(clampToTerm(c)) }),
  reset: () => set({ config: structuredClone(DEFAULT_CONFIG) }),
}))

export type { MortgageConfig }
