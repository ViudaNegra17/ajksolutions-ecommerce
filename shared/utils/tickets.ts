import type { ServicePriceMode, TicketStatus } from '@prisma/client'

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

export function normalizeDocument(value: string | null | undefined) {
  return value?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || null
}

export function normalizePhone(value: string | null | undefined, country = 'EC') {
  if (!value) return null
  const raw = value.trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (raw.startsWith('+')) return `+${digits}`
  if (country === 'EC' && digits.startsWith('0')) return `+593${digits.slice(1)}`
  if (country === 'EC' && digits.length === 9) return `+593${digits}`
  return `+${digits}`
}

export function formatServicePrice(mode: ServicePriceMode, amount: string | null, formatted: string) {
  if (mode === 'QUOTE') return 'Solicitar cotización'
  return mode === 'FROM' ? `Desde ${formatted}` : formatted
}

export const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['ASSIGNED', 'IN_REVIEW', 'CANCELLED'],
  ASSIGNED: ['IN_REVIEW', 'WAITING_CUSTOMER', 'CANCELLED'],
  IN_REVIEW: ['WAITING_CUSTOMER', 'QUOTED', 'IN_PROGRESS', 'CANCELLED'],
  WAITING_CUSTOMER: ['IN_REVIEW', 'QUOTED', 'IN_PROGRESS', 'CANCELLED'],
  QUOTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: []
}

export function canTransition(from: TicketStatus, to: TicketStatus) {
  return from === to || ticketTransitions[from].includes(to)
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) throw new Error('El número comercial de WhatsApp no está configurado.')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
