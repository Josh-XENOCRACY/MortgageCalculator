import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedPresets } from './SavedPresets'
import { clearPresets, savePreset } from '@/core/presetStore'
import { useMortgageStore, type MortgageConfig } from '@/state/store'

beforeEach(() => {
  clearPresets()
  try {
    localStorage.removeItem('mortgage-app.user-presets.v1')
  } catch {
    // no localStorage in this environment
  }
  useMortgageStore.setState({
    config: {
      loanAmount: 350_000,
      termMonths: 300,
      rateSchedule: [{ startMonth: 0, annualRatePct: 4.5 }],
      overpaymentBlocks: [],
      oneOffs: [],
      overpaymentMode: 'reduce_term',
    },
  })
})

function loadCurrentConfig(): MortgageConfig {
  return structuredClone(useMortgageStore.getState().config)
}

describe('SavedPresets', () => {
  it('save + load + delete round-trip', async () => {
    const user = userEvent.setup()
    render(<SavedPresets />)
    const input = screen.getByLabelText(/name for the new preset/i)
    await user.type(input, 'My scenario')
    await user.click(screen.getByRole('button', { name: 'Save current' }))
    await waitFor(() => {
      expect(screen.getByText('My scenario')).toBeTruthy()
    })
    expect(localStorage.getItem('mortgage-app.user-presets.v1')).not.toBeNull()

    // load it: change the config first, then assert the load reverts it
    useMortgageStore.getState().setLoanAmount(123_456)
    await user.click(screen.getByRole('button', { name: 'Load preset My scenario' }))
    await waitFor(() => {
      expect(useMortgageStore.getState().config.loanAmount).toBe(350_000)
    })

    // delete (jsdom has window.confirm, default = true)
    window.confirm = () => true
    await user.click(screen.getByRole('button', { name: /delete preset my scenario/i }))
    await waitFor(() => {
      expect(screen.queryByText('My scenario')).toBeNull()
    })
  })

  it('shows an error on duplicate names', async () => {
    const user = userEvent.setup()
    render(<SavedPresets />)
    const input = screen.getByLabelText(/name for the new preset/i)
    await user.type(input, 'Taken')
    await user.click(screen.getByRole('button', { name: 'Save current' }))
    await user.clear(input)
    await user.type(input, 'Taken')
    await user.click(screen.getByRole('button', { name: 'Save current' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already saved as "taken"/i)
    })
  })

  it('save button is empty until the name is typed', () => {
    render(<SavedPresets />)
    const input = screen.getByLabelText(/name for the new preset/i)
    expect(screen.getByRole('button', { name: 'Save current' })).toBeDisabled()
    expect(input).toHaveValue('')
  })
})

describe('SavedPresets seeded state', () => {
  it('lists existing presets and loads one', async () => {
    savePreset('seed1', 'Stored plan', loadCurrentConfig())
    const user = userEvent.setup()
    render(<SavedPresets />)
    expect(screen.getByText('Stored plan')).toBeTruthy()
    useMortgageStore.getState().setLoanAmount(999_999)
    await user.click(screen.getByRole('button', { name: 'Load preset Stored plan' }))
    await waitFor(() => {
      expect(useMortgageStore.getState().config.loanAmount).toBe(350_000)
    })
  })
})
