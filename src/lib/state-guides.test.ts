import { describe, it, expect } from 'vitest'
import { STATE_GUIDES, describeDueDates, getStateGuideByCode, getStateGuideBySlug, stateFaq, stateSlug } from './state-guides'

const guide = (code: string) => {
  const g = getStateGuideByCode(code)
  if (!g) throw new Error(`no guide for ${code}`)
  return g
}

describe('state guides', () => {
  it('covers every state and DC with unique, readable slugs', () => {
    expect(STATE_GUIDES).toHaveLength(51)
    expect(new Set(STATE_GUIDES.map((g) => g.slug)).size).toBe(51)
    expect(stateSlug('New York')).toBe('new-york')
    expect(getStateGuideBySlug('district-of-columbia')?.code).toBe('DC')
    expect(getStateGuideBySlug('texas')?.code).toBe('TX')
    expect(getStateGuideBySlug('narnia')).toBeUndefined()
  })

  it('describes a sales-only threshold, the period, marketplace rule and filing options', () => {
    const tx = guide('TX')
    expect(tx.threshold).toBe('$500,000 in sales')
    expect(tx.thresholdShort).toBe('$500K')
    expect(tx.periodPhrase).toBe('in the previous 12 months')
    expect(tx.marketplaceCounts).toBe(true)
    expect(tx.filing.map((f) => [f.label, f.due, f.isDefault])).toEqual([
      ['Monthly', 'due the 20th of the following month', false],
      ['Quarterly', 'due the 20th of the following month', true],
      ['Annual', 'due January 20', false],
    ])
    expect(tx.registration?.portalName).toBe('Texas Comptroller')
  })

  it('says whether both tests or either test applies', () => {
    expect(guide('CT').threshold).toBe('$100,000 in retail sales and 200 transactions (both)')
    expect(guide('AR').threshold).toBe('$100,000 in taxable sales or 200 transactions')
    expect(guide('NY').threshold).toBe('$500,000 in sales and more than 100 transactions (both)')
    expect(guide('NY').thresholdShort).toBe('$500K and over 100 transactions')
    expect(guide('MS').threshold).toBe('More than $250,000 in sales')
  })

  it('groups due dates that are the same, and calls DC by its short name', () => {
    expect(describeDueDates(guide('TX'))).toBe(
      'Monthly and quarterly returns are due the 20th of the following month. Annual returns are due January 20.'
    )
    expect(describeDueDates(guide('WA'))).toBe(
      'Monthly returns are due the 25th of the following month. Quarterly returns are due the last day of the following month. Annual returns are due April 15.'
    )
    const dc = guide('DC')
    expect(dc.shortName).toBe('DC')
    expect(stateFaq(dc).map((f) => f.question)).toContain("What is DC's economic nexus threshold?")
  })

  it('handles states without a statewide sales tax', () => {
    const de = guide('DE')
    expect(de.threshold).toBeNull()
    expect(de.filing).toEqual([])
    expect(de.thresholdShort).toBe('No sales tax')
    expect(stateFaq(de)[0].answer).toMatch(/no statewide sales tax/)
    const ak = guide('AK')
    expect(ak.thresholdShort).toBe('No state tax (local $100K)')
    expect(stateFaq(ak)[0].answer).toMatch(/Alaska Remote Seller Sales Tax Commission.*\$100,000/)
  })

  it('lists only the filing frequencies a state offers, with its exceptions', () => {
    expect(guide('IN').filing.map((f) => f.period)).toEqual(['monthly', 'annual'])
    expect(guide('OH').filing.map((f) => f.period)).toEqual(['monthly'])
    expect(guide('VT').filing[0].due).toBe('due the 25th of the following month (January returns are due February 23)')
    expect(guide('NY').filing.find((f) => f.period === 'quarterly')?.label).toMatch(/Mar–May/)
    expect(guide('MA').filing.find((f) => f.isDefault)?.due).toBe('due the 30th of the following month')
  })

  it('writes complete answers for every state', () => {
    for (const g of STATE_GUIDES) {
      const faq = stateFaq(g)
      expect(faq.length).toBeGreaterThan(0)
      for (const { question, answer } of faq) {
        expect(`${question} ${answer}`).not.toMatch(/undefined|null|NaN|\.\./)
      }
      if (g.hasSalesTax) {
        expect(g.threshold).toBeTruthy()
        expect(g.filing.some((f) => f.isDefault)).toBe(true)
        expect(g.registration?.url).toMatch(/^https:\/\//)
      }
    }
  })
})

describe('extra notes', () => {
  it('keeps notes that add something and drops ones that restate the threshold', () => {
    expect(guide('TX').extraNote).toBeNull()
    expect(guide('AR').extraNote).toBeNull()
    expect(guide('DE').extraNote).toBeNull()
    expect(guide('CO').extraNote).toBe('Retail delivery fee also applies.')
    expect(guide('IL').extraNote).toBe('Illinois dropped its 200-transaction test effective Jan 1, 2026, so only sales dollars count.')
    expect(guide('NM').extraNote).toMatch(/^Gross receipts tax/)
  })
})
