import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encryptToken,
  decryptToken,
  isEncryptedToken,
  encryptConnectionWriteArgs,
  decryptConnectionResult,
  TOKEN_PREFIX,
} from './token-crypto'

const ORIGINAL_ENV = { ...process.env }

describe('token-crypto', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.PLATFORM_TOKEN_KEY
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  describe('encryptToken / decryptToken', () => {
    it('round-trips a value', () => {
      const encrypted = encryptToken('shpat_abc123')
      expect(encrypted).not.toBe('shpat_abc123')
      expect(encrypted.startsWith(TOKEN_PREFIX)).toBe(true)
      expect(decryptToken(encrypted)).toBe('shpat_abc123')
    })

    it('uses a fresh IV each time', () => {
      expect(encryptToken('same')).not.toBe(encryptToken('same'))
    })

    it('is idempotent for already-encrypted values', () => {
      const once = encryptToken('secret')
      expect(encryptToken(once)).toBe(once)
    })

    it('passes legacy plaintext through on decrypt', () => {
      expect(decryptToken('plain-legacy-token')).toBe('plain-legacy-token')
    })

    it('leaves null, undefined and empty values alone', () => {
      expect(encryptToken(null)).toBeNull()
      expect(encryptToken(undefined)).toBeUndefined()
      expect(encryptToken('')).toBe('')
      expect(decryptToken(null)).toBeNull()
    })

    it('round-trips JSON credential blobs and URLs', () => {
      const json = JSON.stringify({ username: 'api', key: 'k:e:y' })
      expect(decryptToken(encryptToken(json))).toBe(json)
      const url = 'https://shop.example.com/path?x=1'
      expect(decryptToken(encryptToken(url))).toBe(url)
    })

    it('uses PLATFORM_TOKEN_KEY (k1) when set, and still reads j1 values', () => {
      const oldValue = encryptToken('written-before-dedicated-key')
      expect(oldValue).toContain(`${TOKEN_PREFIX}j1:`)

      process.env.PLATFORM_TOKEN_KEY = 'a-dedicated-platform-token-key'
      const newValue = encryptToken('written-after')
      expect(newValue).toContain(`${TOKEN_PREFIX}k1:`)

      expect(decryptToken(oldValue)).toBe('written-before-dedicated-key')
      expect(decryptToken(newValue)).toBe('written-after')
    })

    it('throws a reconnect message when the key is gone', () => {
      const encrypted = encryptToken('secret')
      delete process.env.JWT_SECRET
      expect(() => decryptToken(encrypted)).toThrow(/reconnect/i)
    })

    it('throws when the ciphertext was tampered with', () => {
      const encrypted = encryptToken('secret')
      const parts = encrypted.split(':')
      parts[4] = Buffer.from('tampered').toString('base64')
      expect(() => decryptToken(parts.join(':'))).toThrow(/reconnect/i)
    })

    it('stores plaintext (with a warning) when no secret is configured', () => {
      delete process.env.JWT_SECRET
      expect(encryptToken('dev-only')).toBe('dev-only')
    })

    it('detects encrypted values', () => {
      expect(isEncryptedToken(encryptToken('x'))).toBe(true)
      expect(isEncryptedToken('x')).toBe(false)
      expect(isEncryptedToken(null)).toBe(false)
    })
  })

  describe('Prisma arg/result helpers', () => {
    it('encrypts credential fields in create data', () => {
      const args = encryptConnectionWriteArgs({
        data: { userId: 'u1', platform: 'shopify', accessToken: 'tok', refreshToken: 'ref', platformName: 'Shop' },
      })
      expect(isEncryptedToken(args.data.accessToken)).toBe(true)
      expect(isEncryptedToken(args.data.refreshToken)).toBe(true)
      expect(args.data.platformName).toBe('Shop')
    })

    it('encrypts both branches of an upsert', () => {
      const args = encryptConnectionWriteArgs({
        where: { id: 'c1' },
        create: { accessToken: 'a' },
        update: { accessToken: { set: 'b' } },
      })
      expect(isEncryptedToken(args.create.accessToken)).toBe(true)
      expect(isEncryptedToken((args.update.accessToken as { set: string }).set)).toBe(true)
    })

    it('encrypts every row in createMany', () => {
      const args = encryptConnectionWriteArgs({ data: [{ accessToken: 'a' }, { accessToken: 'b' }] })
      expect(args.data.every((d: { accessToken: string }) => isEncryptedToken(d.accessToken))).toBe(true)
    })

    it('does not mutate the original args', () => {
      const original = { data: { accessToken: 'tok' } }
      encryptConnectionWriteArgs(original)
      expect(original.data.accessToken).toBe('tok')
    })

    it('decrypts single records, arrays and passes other results through', () => {
      const enc = encryptToken('tok')
      expect(decryptConnectionResult({ id: '1', accessToken: enc }).accessToken).toBe('tok')
      expect(decryptConnectionResult([{ accessToken: enc }, { accessToken: 'legacy' }]).map(r => r.accessToken)).toEqual(['tok', 'legacy'])
      expect(decryptConnectionResult(null)).toBeNull()
      expect(decryptConnectionResult({ count: 3 })).toEqual({ count: 3 })
      expect(decryptConnectionResult(5)).toBe(5)
    })
  })
})
