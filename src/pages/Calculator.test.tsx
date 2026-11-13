import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { useMortgageStore } from '@/state/store'

// The chart layer pulls in echarts (canvas / import-time side effects) which are
// unnecessary for a render smoke test. Mock the entry points so the full app —
// including the rate editor's impact calcs — renders under jsdom.
vi.mock('echarts/core', () => ({ use: () => undefined }))
vi.mock('echarts-for-react', () => ({
  default: () => <div data-testid="chart-stub" />,
}))

describe('Calculator page (render smoke test)', () => {
  it('renders the full UI without crashing (default config = one flat rate)', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /mortgage calculator/i })).toBeTruthy()
    expect(screen.getByText('Loan setup')).toBeTruthy()
    expect(screen.getByText('Rate schedule')).toBeTruthy()
    expect(screen.getByText('Monthly payment')).toBeTruthy()
  })

  it('recomputes after changing the loan amount', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText(/loan amount/i)
    await user.clear(input)
    await user.type(input, '400000') // -> 400,000
    await waitFor(() => {
      expect(useMortgageStore.getState().config.loanAmount).toBe(400_000)
    })
    // re-assert the UI is still mounted and interactive after the re-sim
    expect(screen.getByRole('heading', { name: /mortgage calculator/i })).toBeTruthy()
  })
})
