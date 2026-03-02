import { describe, it, expect } from 'vitest'
import {
  STATE_REGISTRATION_URLS,
  getStateRegistrationUrl,
  getAllRegistrationUrls,
} from './state-registration-urls'

describe('state-registration-urls', () => {
  describe('STATE_REGISTRATION_URLS', () => {
    it('should have registration URLs for sales tax states', () => {
      // Should cover the 46 states with sales tax (excluding AK, DE, MT, NH, OR)
      expect(Object.keys(STATE_REGISTRATION_URLS).length).toBeGreaterThanOrEqual(45)
    })

    it('should have valid URL structure for each state', () => {
      for (const [code, info] of Object.entries(STATE_REGISTRATION_URLS)) {
        expect(info.stateCode).toBe(code)
        expect(info.registrationUrl).toMatch(/^https?:\/\//)
        expect(info.portalName).toBeTruthy()
      }
    })

    it('should not include no-sales-tax states', () => {
      expect(STATE_REGISTRATION_URLS['DE']).toBeUndefined()
      expect(STATE_REGISTRATION_URLS['MT']).toBeUndefined()
      expect(STATE_REGISTRATION_URLS['NH']).toBeUndefined()
      expect(STATE_REGISTRATION_URLS['OR']).toBeUndefined()
      // AK has local jurisdictions, may or may not be included
    })
  })

  describe('getStateRegistrationUrl', () => {
    it('should return undefined for invalid state', () => {
      expect(getStateRegistrationUrl('XX')).toBeUndefined()
    })

    it('should return registration info for California', () => {
      const ca = getStateRegistrationUrl('CA')
      expect(ca).toBeDefined()
      expect(ca?.stateCode).toBe('CA')
      expect(ca?.portalName).toBe('California CDTFA')
      expect(ca?.registrationUrl).toContain('cdtfa.ca.gov')
    })

    it('should return registration info for Texas', () => {
      const tx = getStateRegistrationUrl('TX')
      expect(tx).toBeDefined()
      expect(tx?.portalName).toBe('Texas Comptroller')
    })

    it('should return undefined for Delaware (no sales tax)', () => {
      expect(getStateRegistrationUrl('DE')).toBeUndefined()
    })
  })

  describe('getAllRegistrationUrls', () => {
    it('should return array of all registration URLs', () => {
      const urls = getAllRegistrationUrls()
      expect(Array.isArray(urls)).toBe(true)
      expect(urls.length).toBeGreaterThanOrEqual(45)
    })

    it('should return objects with required fields', () => {
      const urls = getAllRegistrationUrls()
      for (const url of urls) {
        expect(url).toHaveProperty('stateCode')
        expect(url).toHaveProperty('registrationUrl')
        expect(url).toHaveProperty('portalName')
      }
    })
  })
})
