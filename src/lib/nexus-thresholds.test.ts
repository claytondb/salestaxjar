import { describe, it, expect } from 'vitest'
import {
  STATE_NEXUS_THRESHOLDS,
  THRESHOLD_BY_STATE,
  getStateThreshold,
  getSalesTaxStates,
  getNoSalesTaxStates,
  calculateExposureStatus,
} from './nexus-thresholds'

describe('nexus-thresholds', () => {
  describe('STATE_NEXUS_THRESHOLDS', () => {
    it('should have 51 entries (50 states + DC)', () => {
      expect(STATE_NEXUS_THRESHOLDS).toHaveLength(51)
    })

    it('should have unique state codes', () => {
      const codes = STATE_NEXUS_THRESHOLDS.map(t => t.stateCode)
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBe(51)
    })
  })

  describe('THRESHOLD_BY_STATE', () => {
    it('should have all 51 states indexed', () => {
      expect(Object.keys(THRESHOLD_BY_STATE)).toHaveLength(51)
    })

    it('should look up California correctly', () => {
      const ca = THRESHOLD_BY_STATE['CA']
      expect(ca.stateName).toBe('California')
      expect(ca.salesThreshold).toBe(500000)
      expect(ca.hasSalesTax).toBe(true)
    })
  })

  describe('getStateThreshold', () => {
    it('should return undefined for invalid state', () => {
      expect(getStateThreshold('XX')).toBeUndefined()
    })

    it('should return threshold for valid state', () => {
      const texas = getStateThreshold('TX')
      expect(texas).toBeDefined()
      expect(texas?.stateName).toBe('Texas')
      expect(texas?.salesThreshold).toBe(500000)
    })
  })

  describe('getSalesTaxStates', () => {
    it('should return states with sales tax', () => {
      const states = getSalesTaxStates()
      expect(states.length).toBeGreaterThan(40) // Most states have sales tax
      expect(states.every(s => s.hasSalesTax)).toBe(true)
    })

    it('should not include Delaware', () => {
      const states = getSalesTaxStates()
      expect(states.find(s => s.stateCode === 'DE')).toBeUndefined()
    })
  })

  describe('getNoSalesTaxStates', () => {
    it('should return states without sales tax', () => {
      const states = getNoSalesTaxStates()
      expect(states.length).toBe(5) // AK, DE, MT, NH, OR
      expect(states.every(s => !s.hasSalesTax)).toBe(true)
    })

    it('should include known no-sales-tax states', () => {
      const states = getNoSalesTaxStates()
      const codes = states.map(s => s.stateCode)
      expect(codes).toContain('DE')
      expect(codes).toContain('MT')
      expect(codes).toContain('NH')
      expect(codes).toContain('OR')
      expect(codes).toContain('AK')
    })
  })

  describe('calculateExposureStatus', () => {
    const californiaThreshold = THRESHOLD_BY_STATE['CA'] // $500K threshold
    const georgiaThreshold = THRESHOLD_BY_STATE['GA'] // $100K or 200 transactions

    it('should return safe for no-sales-tax state', () => {
      const delawareThreshold = THRESHOLD_BY_STATE['DE']
      const result = calculateExposureStatus(1000000, 500, delawareThreshold)
      expect(result.status).toBe('safe')
      expect(result.highestPercentage).toBe(0)
    })

    it('should return safe for low sales', () => {
      const result = calculateExposureStatus(50000, 50, californiaThreshold)
      expect(result.status).toBe('safe')
      expect(result.salesPercentage).toBe(10) // 50K / 500K = 10%
    })

    it('should return approaching when at 75%', () => {
      const result = calculateExposureStatus(375000, 0, californiaThreshold)
      expect(result.status).toBe('approaching')
      expect(result.salesPercentage).toBe(75)
    })

    it('should return warning when at 90%', () => {
      const result = calculateExposureStatus(450000, 0, californiaThreshold)
      expect(result.status).toBe('warning')
      expect(result.salesPercentage).toBe(90)
    })

    it('should return exceeded when at 100%', () => {
      const result = calculateExposureStatus(500000, 0, californiaThreshold)
      expect(result.status).toBe('exceeded')
      expect(result.salesPercentage).toBe(100)
    })

    it('should return exceeded when over 100%', () => {
      const result = calculateExposureStatus(750000, 0, californiaThreshold)
      expect(result.status).toBe('exceeded')
      expect(result.salesPercentage).toBe(150)
    })

    it('should check transactions threshold when applicable', () => {
      // Georgia: $100K OR 200 transactions
      const result = calculateExposureStatus(50000, 200, georgiaThreshold)
      expect(result.status).toBe('exceeded')
      expect(result.transactionPercentage).toBe(100)
      expect(result.highestPercentage).toBe(100)
    })

    it('should use highest percentage between sales and transactions', () => {
      // Georgia: $100K OR 200 transactions
      // Sales at 50%, transactions at 80% -> use transactions
      const result = calculateExposureStatus(50000, 160, georgiaThreshold)
      expect(result.status).toBe('approaching') // 80% > 75% threshold
      expect(result.highestPercentage).toBe(80)
    })
  })
})
