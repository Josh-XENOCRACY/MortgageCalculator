import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MAX_TERM, MIN_TERM } from '@/core/serialize'
import { partsToTerm, termToParts, TermPair } from './LoanSetupForm'

describe('term helpers', () => {
  it('splits term into years+months without loss', () => {
    for (const t of [0, 1, 11, 12, 13, 35, 300, 599, 600]) {
      const { years, months } = termToParts(t)
      expect(years * 12 + months).toBe(t)
      expect(years).toBeGreaterThanOrEqual(0)
      expect(months).toBeGreaterThanOrEqual(0)
      expect(months).toBeLessThan(12)
    }
  })

  it('clamps to the allowed range', () => {
    expect(partsToTerm(0, 0)).toBe(MIN_TERM)
    expect(partsToTerm(100, 11)).toBe(MAX_TERM)
  })
})

describe('TermPair component', () => {
  it('editing months recomputes the total', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TermPair termMonths={300} onChange={onChange} />)
    const months = screen.getByLabelText('months')
    await user.type(months, '3') // 300 = 25y 0m → months "0"+3 = 3 → 25y 3m = 303
    expect(onChange).toHaveBeenLastCalledWith(303)
  })

  it('editing years recomputes the total', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TermPair termMonths={300} onChange={onChange} />)
    const years = screen.getByLabelText('years')
    await user.clear(years)
    await user.type(years, '20') // 20y 0m = 240
    expect(onChange).toHaveBeenLastCalledWith(240)
  })

  it('round-trips: total 59 → 4y11m → total 59', () => {
    const parts = termToParts(59)
    expect(parts).toEqual({ years: 4, months: 11 })
    expect(partsToTerm(parts.years, parts.months)).toBe(59)
  })
})
