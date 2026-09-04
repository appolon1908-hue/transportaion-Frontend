import { describe, expect, it } from 'vitest'
import { mutationHeaders } from './client'

describe('mutationHeaders', () => {
  it('adds an idempotency key', () => {
    const headers = mutationHeaders() as Record<string, string>
    expect(headers['Idempotency-Key']).toBeTruthy()
  })

  it('adds If-Match when an etag is supplied', () => {
    const headers = mutationHeaders('"7"') as Record<string, string>
    expect(headers['If-Match']).toBe('"7"')
  })
})
