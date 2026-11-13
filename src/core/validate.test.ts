import { describe, expect, it } from 'vitest'
import { validateConfig } from './validate'
import type { MortgageConfig } from './types'

const good: MortgageConfig = {
  loanAmount: 350_000,
  termMonths: 300,
  rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
  overpaymentBlocks: [{ id: 'b1', startMonth: 0, endMonth: 59, amount: 400, mode: 'reduce_term' }],
  oneOffs: [{ id: 'o1', month: 240, amount: 40_000, mode: 'reduce_payment' }],
  overpaymentMode: 'reduce_term',
}

describe('validateConfig', () => {
  it('accepts a well-formed config and returns equal data', () => {
    const v = validateConfig(structuredClone(good))
    expect(v).not.toBeNull()
    expect(v).toEqual(good)
  })

  it('accepts a config without event ids (URL-parsed shape)', () => {
    const {
      overpaymentBlocks: [b],
      oneOffs: [o],
      ...rest
    } = good
    const stripId = {
      ...b,
      id: undefined,
    }
    const v = validateConfig({
      ...rest,
      overpaymentBlocks: [stripId],
      oneOffs: [{ ...o, id: undefined }],
    })
    expect(v).not.toBeNull()
    expect(v?.overpaymentBlocks[0]?.id).toBeUndefined()
    expect(v?.oneOffs[0]?.id).toBeUndefined()
  })

  it('rejects a negative loan amount', () => {
    expect(validateConfig({ ...good, loanAmount: -1 })).toBeNull()
  })

  it('rejects a zero/negative/missing term', () => {
    expect(validateConfig({ ...good, termMonths: 0 })).toBeNull()
    expect(validateConfig({ ...good, termMonths: -12 })).toBeNull()
    expect(validateConfig({ ...good, termMonths: undefined })).toBeNull()
  })

  it('rejects an unknown overpayment mode', () => {
    expect(validateConfig({ ...good, overpaymentMode: 'reduce_both' })).toBeNull()
  })

  it('rejects a rate tier with a negative rate or non-numeric month', () => {
    expect(
      validateConfig({ ...good, rateSchedule: [{ startMonth: 0, annualRatePct: -1 }] })
    ).toBeNull()
    expect(
      validateConfig({ ...good, rateSchedule: [{ startMonth: 'x', annualRatePct: 5 }] })
    ).toBeNull()
  })

  it('rejects a block with non-positive amount or inverted range', () => {
    expect(
      validateConfig({ ...good, overpaymentBlocks: [{ startMonth: 10, endMonth: 5, amount: 100 }] })
    ).toBeNull()
    expect(
      validateConfig({ ...good, overpaymentBlocks: [{ startMonth: 0, endMonth: 5, amount: 0 }] })
    ).toBeNull()
  })

  it('rejects a one-off with a non-numeric month', () => {
    expect(validateConfig({ ...good, oneOffs: [{ month: 'soon', amount: 1000 }] })).toBeNull()
  })

  it('rejects an event month beyond the term', () => {
    expect(validateConfig({ ...good, oneOffs: [{ month: 301, amount: 1000 }] })).toBeNull()
    expect(
      validateConfig({
        ...good,
        overpaymentBlocks: [{ startMonth: 0, endMonth: 9999, amount: 100 }],
      })
    ).toBeNull()
  })

  it('rejects a non-object record entirely', () => {
    expect(validateConfig(null)).toBeNull()
    expect(validateConfig(42)).toBeNull()
    expect(validateConfig('350000')).toBeNull()
  })

  it('rejects a row missing rateSchedule', () => {
    const { rateSchedule: dropMe, ...rest } = good
    void dropMe
    expect(validateConfig(rest)).toBeNull()
  })
})
