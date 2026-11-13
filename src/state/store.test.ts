import { beforeEach, describe, expect, it } from 'vitest'
import { useMortgageStore, DEFAULT_CONFIG } from './store'

beforeEach(() => {
  useMortgageStore.setState({ config: structuredClone(DEFAULT_CONFIG) })
})

describe('upsert replace-by-key (no duplicate spawn when a row moves)', () => {
  it('moving a second rate tier to another month keeps exactly 2 tiers', () => {
    const s = useMortgageStore.getState()
    // Seed two tiers: month 0 @4.5%, month 24 @5.5%.
    s.upsertRatePeriod(0, { startMonth: 0, annualRatePct: 4.5 })
    s.upsertRatePeriod(24, { startMonth: 24, annualRatePct: 5.5 })
    expect(useMortgageStore.getState().config.rateSchedule).toHaveLength(2)

    // Move the tier at month 24 to month 12 (a *new* month). Its key is 24.
    useMortgageStore.getState().upsertRatePeriod(24, { startMonth: 12, annualRatePct: 5.5 })

    const schedule = useMortgageStore.getState().config.rateSchedule
    expect(schedule).toHaveLength(2)
    expect(schedule.find((p) => p.startMonth === 12)?.annualRatePct).toBe(5.5)
    expect(schedule.find((p) => p.startMonth === 24)).toBeUndefined()
    // no duplicate at 12
    expect(schedule.filter((p) => p.startMonth === 12)).toHaveLength(1)
  })

  it('changing a block’s "from month" keeps exactly 1 block', () => {
    const s = useMortgageStore.getState()
    s.upsertOverpaymentBlock('b1', { startMonth: 12, endMonth: 60, amount: 500 })
    expect(useMortgageStore.getState().config.overpaymentBlocks).toHaveLength(1)

    useMortgageStore
      .getState()
      .upsertOverpaymentBlock('b1', { startMonth: 15, endMonth: 60, amount: 500 })

    const blocks = useMortgageStore.getState().config.overpaymentBlocks
    expect(blocks).toHaveLength(1)
    expect(blocks[0].startMonth).toBe(15)
    expect(blocks[0].id).toBe('b1')
  })

  it('changing a one-off’s "at month" keeps exactly 1 one-off', () => {
    const s = useMortgageStore.getState()
    s.upsertOneOff('o1', { month: 60, amount: 15_000 })
    expect(useMortgageStore.getState().config.oneOffs).toHaveLength(1)

    useMortgageStore.getState().upsertOneOff('o1', { month: 48, amount: 15_000 })

    const oneOffs = useMortgageStore.getState().config.oneOffs
    expect(oneOffs).toHaveLength(1)
    expect(oneOffs[0].month).toBe(48)
    expect(oneOffs[0].id).toBe('o1')
  })
})

describe('overpayment events in the same month coexist (cumulative plan)', () => {
  it('two one-offs in the same month are both kept', () => {
    const s = useMortgageStore.getState()
    s.upsertOneOff('a', { month: 60, amount: 10_000 })
    s.upsertOneOff('b', { month: 60, amount: 5_000 })

    const oneOffs = useMortgageStore.getState().config.oneOffs
    expect(oneOffs).toHaveLength(2)
    expect(oneOffs.map((o) => o.amount).sort((x, y) => x - y)).toEqual([5_000, 10_000])
  })

  it('a one-off in a month covered by a block is kept alongside the block', () => {
    const s = useMortgageStore.getState()
    s.upsertOverpaymentBlock('b', { startMonth: 0, endMonth: 60, amount: 500 })
    s.upsertOneOff('o', { month: 30, amount: 20_000 })

    const cfg = useMortgageStore.getState().config
    expect(cfg.overpaymentBlocks).toHaveLength(1)
    expect(cfg.oneOffs).toHaveLength(1)
  })

  it('removing one of two same-month one-offs keeps the other', () => {
    const s = useMortgageStore.getState()
    s.upsertOneOff('a', { month: 60, amount: 10_000 })
    s.upsertOneOff('b', { month: 60, amount: 5_000 })
    s.removeOneOff('b')

    const oneOffs = useMortgageStore.getState().config.oneOffs
    expect(oneOffs).toHaveLength(1)
    expect(oneOffs[0].amount).toBe(10_000)
  })

  it('removing a block does not touch a same-period one-off and vice versa', () => {
    const s = useMortgageStore.getState()
    s.upsertOverpaymentBlock('b', { startMonth: 0, endMonth: 60, amount: 500 })
    s.upsertOneOff('o', { month: 30, amount: 20_000 })
    s.removeOverpaymentBlock('b')
    s.removeOneOff('o')

    const cfg = useMortgageStore.getState().config
    expect(cfg.overpaymentBlocks).toHaveLength(0)
    expect(cfg.oneOffs).toHaveLength(0)
  })
})
