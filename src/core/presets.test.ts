import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import { parse, serialize } from './serialize'
import { simulate } from './engine'

describe('presets', () => {
  it.each(PRESETS)('$name serializes and round-trips exactly', (preset) => {
    const qs = serialize(preset.config)
    const { config, errors } = parse(qs, PRESETS[0].config)
    expect(errors).toEqual([])
    expect(config).toEqual(preset.config)
  })

  it('every preset pays off by term end', () => {
    for (const p of PRESETS) {
      expect(simulate(p.config).summary.payoffMonth).not.toBeNull()
    }
  })

  it('presets are distinguishable (not all the same payoff)', () => {
    const payoffs = PRESETS.map((p) => simulate(p.config).summary.payoffMonth)
    expect(new Set(payoffs).size).toBeGreaterThan(1)
  })
})
