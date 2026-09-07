import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function hashHandoffToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function createHandoffToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashHandoffToken(token) }
}

export function verifyHandoffToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashHandoffToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
