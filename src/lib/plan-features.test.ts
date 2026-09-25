import { describe, it, expect } from 'vitest'
import { PLAN_MARKETING } from './plan-features'
import { PLAN_ORDER_LIMITS, PLAN_PLATFORM_LIMITS } from './plans'
import { PLANS } from './stripe'

const allText = (tier: keyof typeof PLAN_MARKETING) =>
  [...PLAN_MARKETING[tier].features.map(f => f.text), ...PLAN_MARKETING[tier].highlights].join(' | ')

describe('plan-features (customer-facing plan copy)', () => {
  it('prices match the Stripe plan config', () => {
    expect(PLAN_MARKETING.starter.price).toBe(PLANS.starter.price)
    expect(PLAN_MARKETING.pro.price).toBe(PLANS.pro.price)
    expect(PLAN_MARKETING.enterprise.price).toBe(PLANS.enterprise.price)
  })

  it('order limits in the copy match the enforced limits', () => {
    expect(allText('free')).toContain(`${PLAN_ORDER_LIMITS.free} orders/month`)
    expect(allText('starter')).toContain(`${PLAN_ORDER_LIMITS.starter!.toLocaleString()} orders/month`)
    expect(allText('pro')).toContain(`${PLAN_ORDER_LIMITS.pro!.toLocaleString()} orders/month`)
    expect(PLAN_ORDER_LIMITS.enterprise).toBeNull()
    expect(allText('enterprise')).toMatch(/Unlimited orders/)
  })

  it('store connection counts in the copy match the enforced caps', () => {
    expect(allText('free')).toContain(`${PLAN_PLATFORM_LIMITS.free} store connection`)
    expect(allText('starter')).toContain(`${PLAN_PLATFORM_LIMITS.starter} store connections`)
    expect(allText('pro')).toContain(`${PLAN_PLATFORM_LIMITS.pro} store connections`)
    expect(PLAN_PLATFORM_LIMITS.enterprise).toBeNull()
    expect(allText('enterprise')).toMatch(/Unlimited store connections/)
  })

  it('never sells planned ("coming soon") features in a plan', () => {
    for (const tier of Object.keys(PLAN_MARKETING) as (keyof typeof PLAN_MARKETING)[]) {
      expect(allText(tier).toLowerCase()).not.toMatch(/soon|coming|auto-filing|filing assistance/)
    }
  })
})
