import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberInput } from './NumberInput'

describe('NumberInput decimal handling', () => {
  it('keeps a decimal rate when a step is set (was truncating to integer)', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<NumberInput label="APR" value={0} onCommit={onCommit} step={0.01} delayMs={0} />)
    const input = screen.getByLabelText('APR')
    await user.clear(input)
    await user.type(input, '4.25')
    expect(onCommit).toHaveBeenLastCalledWith(4.25)
  })

  it('still quantises to the step (e.g. 4.5675 → 4.57)', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<NumberInput label="APR" value={0} onCommit={onCommit} step={0.01} delayMs={0} />)
    const input = screen.getByLabelText('APR')
    await user.clear(input)
    await user.type(input, '4.5675')
    expect(onCommit).toHaveBeenLastCalledWith(4.57)
  })

  it('integer fields (no step) still round to whole numbers', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<NumberInput label="months" value={0} onCommit={onCommit} delayMs={0} />)
    const input = screen.getByLabelText('months')
    await user.clear(input)
    await user.type(input, '12.7')
    expect(onCommit).toHaveBeenLastCalledWith(13)
  })
})
