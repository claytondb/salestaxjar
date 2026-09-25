import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/platform-token-migration', () => ({
  encryptLegacyPlatformTokens: vi.fn(),
}))
vi.mock('@/lib/filing-reminders', () => ({
  processBatchReminders: vi.fn(),
}))
vi.mock('@/lib/drip', () => ({
  runDripCampaign: vi.fn(),
}))

import { GET } from './route'
import { encryptLegacyPlatformTokens } from '@/lib/platform-token-migration'
import { processBatchReminders } from '@/lib/filing-reminders'
import { runDripCampaign } from '@/lib/drip'

const ORIGINAL_ENV = { ...process.env }

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://sails.tax/api/cron/daily', { headers })
}

const emptyBatch = { processed: 0, sent: 0, alreadySent: 0, failed: 0, results: [] }

describe('GET /api/cron/daily', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-cron-secret' }
    delete process.env.ONBOARDING_EMAILS_ENABLED
    vi.mocked(encryptLegacyPlatformTokens).mockResolvedValue({ checked: 0, encrypted: 0, errors: 0 })
    vi.mocked(processBatchReminders).mockResolvedValue(emptyBatch)
    vi.mocked(runDripCampaign).mockResolvedValue({
      day1: { processed: 0, sent: 0, skipped: 0, errors: 0 },
      day3: { processed: 0, sent: 0, skipped: 0, errors: 0 },
      day7: { processed: 0, sent: 0, skipped: 0, errors: 0 },
      day14: { processed: 0, sent: 0, skipped: 0, errors: 0 },
    })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects requests without the cron secret', async () => {
    const res = await GET(request())
    expect(res.status).toBe(401)
    expect(processBatchReminders).not.toHaveBeenCalled()
  })

  it('rejects a wrong secret', async () => {
    const res = await GET(request({ authorization: 'Bearer nope' }))
    expect(res.status).toBe(401)
  })

  it('accepts the Vercel Cron bearer header', async () => {
    const res = await GET(request({ authorization: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('accepts the x-cron-secret header for manual runs', async () => {
    const res = await GET(request({ 'x-cron-secret': 'test-cron-secret' }))
    expect(res.status).toBe(200)
  })

  it('runs token encryption and both reminder windows', async () => {
    await GET(request({ authorization: 'Bearer test-cron-secret' }))
    expect(encryptLegacyPlatformTokens).toHaveBeenCalledTimes(1)
    expect(processBatchReminders).toHaveBeenCalledWith(7)
    expect(processBatchReminders).toHaveBeenCalledWith(1)
  })

  it('does not send onboarding emails unless explicitly enabled', async () => {
    const res = await GET(request({ authorization: 'Bearer test-cron-secret' }))
    const body = await res.json()
    expect(runDripCampaign).not.toHaveBeenCalled()
    expect(body.tasks.onboardingEmails.skipped).toBeTruthy()
  })

  it('sends onboarding emails when ONBOARDING_EMAILS_ENABLED=true', async () => {
    process.env.ONBOARDING_EMAILS_ENABLED = 'true'
    await GET(request({ authorization: 'Bearer test-cron-secret' }))
    expect(runDripCampaign).toHaveBeenCalledTimes(1)
  })

  it('keeps going when one task fails and reports 207', async () => {
    vi.mocked(encryptLegacyPlatformTokens).mockRejectedValue(new Error('db down'))
    const res = await GET(request({ authorization: 'Bearer test-cron-secret' }))
    expect(res.status).toBe(207)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.tasks.encryptLegacyTokens.ok).toBe(false)
    expect(processBatchReminders).toHaveBeenCalledTimes(2)
  })
})
