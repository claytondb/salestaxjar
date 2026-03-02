import { describe, it, expect } from 'vitest'
import {
  getPlanLevel,
  resolveUserPlan,
  getPlanFeatures,
  canAccessFeature,
  canConnectPlatform,
  getOrderLimit,
  checkOrderLimit,
  getRequiredPlan,
  getPlanDisplayName,
  getOrderLimitDisplay,
  userCanAccess,
  userCanConnectPlatform,
  tierGateError,
  orderLimitError,
  PLAN_ORDER_LIMITS,
  type PlanTier,
  type Feature,
} from './plans'

describe('plans', () => {
  // ---------------------------------------------------------------------------
  // Plan Tier Order & Level
  // ---------------------------------------------------------------------------
  describe('getPlanLevel', () => {
    it('should return 0 for free tier', () => {
      expect(getPlanLevel('free')).toBe(0)
    })

    it('should return 1 for starter tier', () => {
      expect(getPlanLevel('starter')).toBe(1)
    })

    it('should return 2 for pro tier', () => {
      expect(getPlanLevel('pro')).toBe(2)
    })

    it('should return 3 for business tier', () => {
      expect(getPlanLevel('business')).toBe(3)
    })

    it('should maintain ascending order (free < starter < pro < business)', () => {
      expect(getPlanLevel('free')).toBeLessThan(getPlanLevel('starter'))
      expect(getPlanLevel('starter')).toBeLessThan(getPlanLevel('pro'))
      expect(getPlanLevel('pro')).toBeLessThan(getPlanLevel('business'))
    })
  })

  // ---------------------------------------------------------------------------
  // Plan Order Limits
  // ---------------------------------------------------------------------------
  describe('PLAN_ORDER_LIMITS', () => {
    it('should have correct limit for free (0 orders)', () => {
      expect(PLAN_ORDER_LIMITS.free).toBe(0)
    })

    it('should have correct limit for starter (500 orders)', () => {
      expect(PLAN_ORDER_LIMITS.starter).toBe(500)
    })

    it('should have correct limit for pro (5000 orders)', () => {
      expect(PLAN_ORDER_LIMITS.pro).toBe(5000)
    })

    it('should have null (unlimited) for business', () => {
      expect(PLAN_ORDER_LIMITS.business).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // resolveUserPlan
  // ---------------------------------------------------------------------------
  describe('resolveUserPlan', () => {
    it('should return free for null subscription', () => {
      expect(resolveUserPlan(null)).toBe('free')
    })

    it('should return free for undefined subscription', () => {
      expect(resolveUserPlan(undefined)).toBe('free')
    })

    it('should return free for empty subscription object', () => {
      expect(resolveUserPlan({})).toBe('free')
    })

    it('should return free for canceled subscription', () => {
      expect(resolveUserPlan({ plan: 'starter', status: 'canceled' })).toBe('free')
    })

    it('should return free for past_due subscription', () => {
      expect(resolveUserPlan({ plan: 'pro', status: 'past_due' })).toBe('free')
    })

    it('should return plan for active subscription', () => {
      expect(resolveUserPlan({ plan: 'starter', status: 'active' })).toBe('starter')
      expect(resolveUserPlan({ plan: 'pro', status: 'active' })).toBe('pro')
      expect(resolveUserPlan({ plan: 'business', status: 'active' })).toBe('business')
    })

    it('should return plan for trialing subscription', () => {
      expect(resolveUserPlan({ plan: 'starter', status: 'trialing' })).toBe('starter')
      expect(resolveUserPlan({ plan: 'pro', status: 'trialing' })).toBe('pro')
    })

    it('should return free for invalid plan name with active status', () => {
      expect(resolveUserPlan({ plan: 'invalid', status: 'active' })).toBe('free')
      expect(resolveUserPlan({ plan: 'enterprise', status: 'active' })).toBe('free')
    })

    it('should return free for null plan with active status', () => {
      expect(resolveUserPlan({ plan: null, status: 'active' })).toBe('free')
    })
  })

  // ---------------------------------------------------------------------------
  // getPlanFeatures
  // ---------------------------------------------------------------------------
  describe('getPlanFeatures', () => {
    it('should include base features for free tier', () => {
      const features = getPlanFeatures('free')
      expect(features).toContain('nexus_monitoring')
      expect(features).toContain('tax_calculator')
      expect(features).toContain('calculation_history')
      expect(features).toContain('csv_export')
    })

    it('should NOT include paid features for free tier', () => {
      const features = getPlanFeatures('free')
      expect(features).not.toContain('platform_connect')
      expect(features).not.toContain('order_import')
      expect(features).not.toContain('api_keys')
    })

    it('should include starter features for starter tier', () => {
      const features = getPlanFeatures('starter')
      expect(features).toContain('platform_connect')
      expect(features).toContain('order_import')
      expect(features).toContain('order_sync')
      expect(features).toContain('email_deadline_reminders')
      expect(features).toContain('csv_order_import')
    })

    it('should include free features for starter tier', () => {
      const features = getPlanFeatures('starter')
      expect(features).toContain('nexus_monitoring')
      expect(features).toContain('tax_calculator')
    })

    it('should NOT include pro features for starter tier', () => {
      const features = getPlanFeatures('starter')
      expect(features).not.toContain('api_keys')
      expect(features).not.toContain('priority_support')
    })

    it('should include pro features for pro tier', () => {
      const features = getPlanFeatures('pro')
      expect(features).toContain('api_keys')
      expect(features).toContain('priority_support')
    })

    it('should include all lower tier features for pro', () => {
      const features = getPlanFeatures('pro')
      // Free features
      expect(features).toContain('nexus_monitoring')
      // Starter features
      expect(features).toContain('platform_connect')
    })

    it('should include all features for business tier', () => {
      const features = getPlanFeatures('business')
      expect(features).toContain('auto_filing')
      expect(features).toContain('highest_priority_support')
      expect(features).toContain('early_access')
      // Plus all lower tiers
      expect(features).toContain('api_keys')
      expect(features).toContain('platform_connect')
      expect(features).toContain('nexus_monitoring')
    })
  })

  // ---------------------------------------------------------------------------
  // canAccessFeature
  // ---------------------------------------------------------------------------
  describe('canAccessFeature', () => {
    it('should allow free users to access free features', () => {
      expect(canAccessFeature('free', 'nexus_monitoring')).toBe(true)
      expect(canAccessFeature('free', 'tax_calculator')).toBe(true)
    })

    it('should NOT allow free users to access starter features', () => {
      expect(canAccessFeature('free', 'platform_connect')).toBe(false)
      expect(canAccessFeature('free', 'order_import')).toBe(false)
    })

    it('should allow starter users to access starter features', () => {
      expect(canAccessFeature('starter', 'platform_connect')).toBe(true)
      expect(canAccessFeature('starter', 'order_import')).toBe(true)
    })

    it('should NOT allow starter users to access pro features', () => {
      expect(canAccessFeature('starter', 'api_keys')).toBe(false)
    })

    it('should allow business users to access all features', () => {
      expect(canAccessFeature('business', 'nexus_monitoring')).toBe(true)
      expect(canAccessFeature('business', 'platform_connect')).toBe(true)
      expect(canAccessFeature('business', 'api_keys')).toBe(true)
      expect(canAccessFeature('business', 'auto_filing')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // canConnectPlatform
  // ---------------------------------------------------------------------------
  describe('canConnectPlatform', () => {
    it('should NOT allow free users to connect platforms', () => {
      const result = canConnectPlatform('free')
      expect(result.allowed).toBe(false)
      expect(result.requiredPlan).toBe('starter')
    })

    it('should allow starter users to connect platforms', () => {
      const result = canConnectPlatform('starter')
      expect(result.allowed).toBe(true)
    })

    it('should allow pro users to connect platforms', () => {
      const result = canConnectPlatform('pro')
      expect(result.allowed).toBe(true)
    })

    it('should allow business users to connect platforms', () => {
      const result = canConnectPlatform('business')
      expect(result.allowed).toBe(true)
    })

    it('should work with any platform name (all platforms available on starter+)', () => {
      expect(canConnectPlatform('starter', 'shopify').allowed).toBe(true)
      expect(canConnectPlatform('starter', 'woocommerce').allowed).toBe(true)
      expect(canConnectPlatform('starter', 'bigcommerce').allowed).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getOrderLimit
  // ---------------------------------------------------------------------------
  describe('getOrderLimit', () => {
    it('should return 0 for free tier', () => {
      expect(getOrderLimit('free')).toBe(0)
    })

    it('should return 500 for starter tier', () => {
      expect(getOrderLimit('starter')).toBe(500)
    })

    it('should return 5000 for pro tier', () => {
      expect(getOrderLimit('pro')).toBe(5000)
    })

    it('should return null (unlimited) for business tier', () => {
      expect(getOrderLimit('business')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // checkOrderLimit
  // ---------------------------------------------------------------------------
  describe('checkOrderLimit', () => {
    describe('free tier', () => {
      it('should not allow any imports', () => {
        const result = checkOrderLimit('free', 0)
        expect(result.allowed).toBe(false)
        expect(result.limit).toBe(0)
        expect(result.remaining).toBe(0)
        expect(result.upgradeNeeded).toBe('starter')
      })
    })

    describe('starter tier', () => {
      it('should allow imports under limit', () => {
        const result = checkOrderLimit('starter', 100)
        expect(result.allowed).toBe(true)
        expect(result.currentCount).toBe(100)
        expect(result.limit).toBe(500)
        expect(result.remaining).toBe(400)
        expect(result.upgradeNeeded).toBeNull()
      })

      it('should not allow when at limit', () => {
        const result = checkOrderLimit('starter', 500)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.upgradeNeeded).toBe('pro')
      })

      it('should not allow when over limit', () => {
        const result = checkOrderLimit('starter', 600)
        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
        expect(result.upgradeNeeded).toBe('pro')
      })
    })

    describe('pro tier', () => {
      it('should allow imports under limit', () => {
        const result = checkOrderLimit('pro', 1000)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(5000)
        expect(result.remaining).toBe(4000)
      })

      it('should suggest business upgrade when at limit', () => {
        const result = checkOrderLimit('pro', 5000)
        expect(result.allowed).toBe(false)
        expect(result.upgradeNeeded).toBe('business')
      })
    })

    describe('business tier', () => {
      it('should always allow (unlimited)', () => {
        const result = checkOrderLimit('business', 0)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
        expect(result.remaining).toBeNull()
        expect(result.upgradeNeeded).toBeNull()
      })

      it('should allow any count (unlimited)', () => {
        const result = checkOrderLimit('business', 999999)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBeNull()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // getRequiredPlan
  // ---------------------------------------------------------------------------
  describe('getRequiredPlan', () => {
    it('should return free for free features', () => {
      expect(getRequiredPlan('nexus_monitoring')).toBe('free')
      expect(getRequiredPlan('tax_calculator')).toBe('free')
    })

    it('should return starter for starter features', () => {
      expect(getRequiredPlan('platform_connect')).toBe('starter')
      expect(getRequiredPlan('order_import')).toBe('starter')
    })

    it('should return pro for pro features', () => {
      expect(getRequiredPlan('api_keys')).toBe('pro')
      expect(getRequiredPlan('priority_support')).toBe('pro')
    })

    it('should return business for business features', () => {
      expect(getRequiredPlan('auto_filing')).toBe('business')
      expect(getRequiredPlan('early_access')).toBe('business')
    })
  })

  // ---------------------------------------------------------------------------
  // getPlanDisplayName
  // ---------------------------------------------------------------------------
  describe('getPlanDisplayName', () => {
    it('should return human-readable names', () => {
      expect(getPlanDisplayName('free')).toBe('Free')
      expect(getPlanDisplayName('starter')).toBe('Starter')
      expect(getPlanDisplayName('pro')).toBe('Pro')
      expect(getPlanDisplayName('business')).toBe('Business')
    })
  })

  // ---------------------------------------------------------------------------
  // getOrderLimitDisplay
  // ---------------------------------------------------------------------------
  describe('getOrderLimitDisplay', () => {
    it('should format free tier correctly', () => {
      expect(getOrderLimitDisplay('free')).toBe('No order imports')
    })

    it('should format starter tier correctly', () => {
      expect(getOrderLimitDisplay('starter')).toBe('Up to 500 orders/month')
    })

    it('should format pro tier correctly', () => {
      expect(getOrderLimitDisplay('pro')).toBe('Up to 5,000 orders/month')
    })

    it('should format business tier correctly', () => {
      expect(getOrderLimitDisplay('business')).toBe('Unlimited orders')
    })
  })

  // ---------------------------------------------------------------------------
  // userCanAccess (convenience function)
  // ---------------------------------------------------------------------------
  describe('userCanAccess', () => {
    it('should handle null user', () => {
      const result = userCanAccess(null, 'nexus_monitoring')
      expect(result.userPlan).toBe('free')
      expect(result.allowed).toBe(true)
    })

    it('should handle user with active subscription', () => {
      const user = { subscription: { plan: 'pro', status: 'active' } }
      const result = userCanAccess(user, 'api_keys')
      expect(result.userPlan).toBe('pro')
      expect(result.allowed).toBe(true)
    })

    it('should block free user from paid features', () => {
      const result = userCanAccess(null, 'platform_connect')
      expect(result.userPlan).toBe('free')
      expect(result.allowed).toBe(false)
      expect(result.requiredPlan).toBe('starter')
    })
  })

  // ---------------------------------------------------------------------------
  // userCanConnectPlatform (convenience function)
  // ---------------------------------------------------------------------------
  describe('userCanConnectPlatform', () => {
    it('should block free user from connecting', () => {
      const result = userCanConnectPlatform(null)
      expect(result.allowed).toBe(false)
      expect(result.userPlan).toBe('free')
      expect(result.requiredPlan).toBe('starter')
    })

    it('should allow starter user to connect', () => {
      const user = { subscription: { plan: 'starter', status: 'active' } }
      const result = userCanConnectPlatform(user, 'shopify')
      expect(result.allowed).toBe(true)
      expect(result.userPlan).toBe('starter')
    })
  })

  // ---------------------------------------------------------------------------
  // tierGateError
  // ---------------------------------------------------------------------------
  describe('tierGateError', () => {
    it('should build correct error object', () => {
      const error = tierGateError('free', 'starter', 'platform_connect')
      expect(error.error).toBe('Plan upgrade required')
      expect(error.currentPlan).toBe('free')
      expect(error.requiredPlan).toBe('starter')
      expect(error.feature).toBe('platform_connect')
      expect(error.upgradeUrl).toBe('/pricing')
      expect(error.message).toContain('Starter')
      expect(error.message).toContain('Free')
    })
  })

  // ---------------------------------------------------------------------------
  // orderLimitError
  // ---------------------------------------------------------------------------
  describe('orderLimitError', () => {
    it('should build correct error object', () => {
      const error = orderLimitError('starter', 500, 500, 'pro')
      expect(error.error).toBe('Monthly order limit reached')
      expect(error.currentPlan).toBe('starter')
      expect(error.currentCount).toBe(500)
      expect(error.limit).toBe(500)
      expect(error.upgradeTo).toBe('pro')
      expect(error.upgradeUrl).toBe('/pricing')
      expect(error.message).toContain('500')
      expect(error.message).toContain('Starter')
      expect(error.message).toContain('Pro')
    })

    it('should handle no upgrade available', () => {
      const error = orderLimitError('business', 10000, 10000, null)
      expect(error.upgradeTo).toBeNull()
    })
  })
})
