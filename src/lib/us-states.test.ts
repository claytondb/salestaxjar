import { describe, it, expect } from 'vitest'
import { toStateCode, isUsStateCode } from './us-states'

describe('toStateCode', () => {
  it('accepts two-letter codes in any case', () => {
    expect(toStateCode('CA')).toBe('CA')
    expect(toStateCode('ny')).toBe('NY')
    expect(toStateCode(' tx ')).toBe('TX')
    expect(toStateCode('N.Y.')).toBe('NY')
    expect(toStateCode('US-WA')).toBe('WA')
  })

  it('maps full state names — never by truncating', () => {
    expect(toStateCode('Texas')).toBe('TX')
    expect(toStateCode('new york')).toBe('NY')
    expect(toStateCode('North Carolina')).toBe('NC')
    expect(toStateCode('GEORGIA')).toBe('GA')
    expect(toStateCode('Washington')).toBe('WA')
    expect(toStateCode('Washington, D.C.')).toBe('DC')
    expect(toStateCode('District of Columbia')).toBe('DC')
  })

  it('returns null for territories, military addresses, blanks and unknowns', () => {
    expect(toStateCode('PR')).toBeNull()
    expect(toStateCode('Puerto Rico')).toBeNull()
    expect(toStateCode('AE')).toBeNull()
    expect(toStateCode('')).toBeNull()
    expect(toStateCode(null)).toBeNull()
    expect(toStateCode('Ontario')).toBeNull()
    expect(toStateCode('Tex')).toBeNull()
  })

  it('knows the 50 states and DC', () => {
    expect(isUsStateCode('dc')).toBe(true)
    expect(isUsStateCode('GU')).toBe(false)
  })
})
