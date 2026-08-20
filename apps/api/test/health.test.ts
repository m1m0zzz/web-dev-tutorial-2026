import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('GET /health', () => {
  it('200 と { status: "ok" } を返す', async () => {
    const res = await exports.default.fetch('https://example.com/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
