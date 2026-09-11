import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { apiError } from './api-error'

function requiredSecret(name: 'checkout' | 'handoff') {
  const configured =
    name === 'checkout' ? process.env.NUXT_CHECKOUT_SIGNING_SECRET : process.env.NUXT_ORDER_HANDOFF_SECRET
  const value =
    configured || (process.env.NODE_ENV === 'production' ? undefined : process.env.NUXT_SESSION_PASSWORD)
  if (typeof value !== 'string' || value.length < 32) {
    throw apiError(503, 'ORDER_SECURITY_NOT_CONFIGURED', `El secreto privado de ${name} no está configurado.`)
  }
  return value
}

function hmac(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function signCheckoutFingerprint(canonicalCheckout: string) {
  return hmac(requiredSecret('checkout'), `checkout-v1:${canonicalCheckout}`)
}

export function createOrderHandoffToken(requestId: string, orderId: string) {
  return hmac(requiredSecret('handoff'), `order-whatsapp:${requestId}:${orderId}`)
}

export function hashOrderHandoffToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function secureEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}
