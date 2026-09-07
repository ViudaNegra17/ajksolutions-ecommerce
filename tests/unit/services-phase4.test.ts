import { afterEach, describe, expect, it, vi } from 'vitest'
import { serviceSchema } from '../../shared/schemas/service.schema'
import { publicTicketSchema, whatsappOpenedSchema } from '../../shared/schemas/ticket.schema'
import { resolveCustomerIdentity } from '../../shared/utils/customer-identity'
import { wouldCreateServiceCategoryCycle } from '../../shared/utils/service-categories'
import { isTicketAssignmentEligible } from '../../shared/utils/ticket-assignment'
import {
  buildWhatsAppUrl,
  canTransition,
  normalizeDocument,
  normalizeEmail,
  normalizePhone
} from '../../shared/utils/tickets'
import { enforceTicketRateLimit, resetTicketRateLimit } from '../../server/utils/ticket-rate-limit'
import { createHandoffToken, hashHandoffToken, verifyHandoffToken } from '../../server/utils/handoff-token'

const service = {
  name: 'Diagnóstico técnico',
  categoryId: '2b213c9b-e3c2-4ea8-a9bc-7ddacbd316fd',
  priceMode: 'QUOTE',
  price: null,
  priceIncludesTax: false,
  remoteAvailable: true,
  onsiteAvailable: true,
  homeServiceAvailable: false,
  requiresDevice: false,
  allowAttachments: false,
  featured: false,
  active: true,
  fields: [
    {
      key: 'tipo_equipo',
      label: 'Tipo de equipo',
      type: 'SELECT',
      required: true,
      active: true,
      sortOrder: 0,
      validationConfig: null,
      options: [{ value: 'laptop', label: 'Laptop', sortOrder: 0, active: true }]
    }
  ]
}

describe('dominio de servicios y tickets de Fase 4', () => {
  afterEach(() => {
    resetTicketRateLimit()
    vi.unstubAllGlobals()
  })
  it('valida modalidad de precio sin crear valores ficticios', () => {
    expect(serviceSchema.safeParse(service).success).toBe(true)
    expect(serviceSchema.safeParse({ ...service, priceMode: 'FIXED', price: null }).success).toBe(false)
    expect(serviceSchema.safeParse({ ...service, priceMode: 'QUOTE', price: 1 }).success).toBe(false)
  })

  it('protege claves y opciones del formulario dinámico', () => {
    expect(
      serviceSchema.safeParse({ ...service, fields: [{ ...service.fields[0], key: 'status' }] }).success
    ).toBe(false)
    expect(
      serviceSchema.safeParse({ ...service, fields: [{ ...service.fields[0], options: [] }] }).success
    ).toBe(false)
    expect(
      serviceSchema.safeParse({ ...service, fields: [service.fields[0], service.fields[0]] }).success
    ).toBe(false)
  })

  it('valida idempotencia, honeypot y tipos básicos de la solicitud', () => {
    const ticket = {
      requestId: crypto.randomUUID(),
      serviceSlug: 'diagnostico',
      customer: { firstName: 'Ana', lastName: 'Pérez', whatsapp: '0999999999' },
      answers: [],
      website: '',
      startedAt: Date.now() - 2000
    }
    expect(publicTicketSchema.safeParse(ticket).success).toBe(true)
    expect(publicTicketSchema.safeParse({ ...ticket, requestId: 'repetido' }).success).toBe(false)
    expect(publicTicketSchema.safeParse({ ...ticket, website: 'spam' }).success).toBe(false)
  })

  it('normaliza identidad y teléfonos de forma conservadora', () => {
    expect(normalizeEmail(' ANA@EXAMPLE.COM ')).toBe('ana@example.com')
    expect(normalizeDocument('09-123.456')).toBe('09123456')
    expect(normalizePhone('099 999 9999')).toBe('+593999999999')
    expect(normalizePhone('+1 305 555 0100')).toBe('+13055550100')
  })

  it('aplica transiciones explícitas y genera WhatsApp codificado', () => {
    expect(canTransition('NEW', 'ASSIGNED')).toBe(true)
    expect(canTransition('NEW', 'DELIVERED')).toBe(false)
    expect(canTransition('DELIVERED', 'IN_PROGRESS')).toBe(false)
    const url = buildWhatsAppUrl('+593 99 999 9999', 'Ticket: TCK-000001\nHola & gracias')
    expect(url).toContain('wa.me/593999999999')
    expect(url).toContain('%26')
    expect(url).not.toContain('\n')
  })

  it('limita el abuso de solicitudes públicas por IP', () => {
    vi.stubGlobal('getRequestIP', () => '203.0.113.10')
    for (let index = 0; index < 5; index += 1) enforceTicketRateLimit({} as never)
    expect(() => enforceTicketRateLimit({} as never)).toThrowError(
      expect.objectContaining({ statusCode: 429 })
    )
  })

  it('detecta cuando los identificadores normalizados pertenecen a clientes distintos', () => {
    const input = {
      documentNumber: normalizeDocument('09-123'),
      email: normalizeEmail('USER@MAIL.COM'),
      whatsapp: normalizePhone('0999999999')
    }
    const matches = [
      { id: 'customer-a', ...input, email: null, whatsapp: null, deletedAt: null },
      { id: 'customer-b', ...input, documentNumber: null, whatsapp: null, deletedAt: null }
    ]
    expect(resolveCustomerIdentity(input, matches).conflict).toBe(true)
    expect(resolveCustomerIdentity(input, [{ id: 'customer-a', ...input, deletedAt: null }])).toMatchObject({
      conflict: false,
      customer: { id: 'customer-a' }
    })
  })

  it('genera y verifica tokens opacos sin usar el TCK como credencial', () => {
    const handoff = createHandoffToken()
    expect(handoff.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(handoff.hash).toHaveLength(64)
    expect(handoff.hash).toBe(hashHandoffToken(handoff.token))
    expect(verifyHandoffToken(handoff.token, handoff.hash)).toBe(true)
    expect(verifyHandoffToken(createHandoffToken().token, handoff.hash)).toBe(false)
    expect(whatsappOpenedSchema.safeParse({ ticketCode: 'TCK-000001' }).success).toBe(false)
    expect(
      whatsappOpenedSchema.safeParse({
        ticketCode: 'TCK-000001',
        handoffToken: handoff.token
      }).success
    ).toBe(true)
  })

  it('rechaza ciclos directos e indirectos de categorías de servicio', () => {
    expect(wouldCreateServiceCategoryCycle('A', 'A', [])).toBe(true)
    expect(wouldCreateServiceCategoryCycle('A', 'C', ['C', 'B', 'A'])).toBe(true)
    expect(wouldCreateServiceCategoryCycle('A', 'C', ['C', 'B'])).toBe(false)
    expect(wouldCreateServiceCategoryCycle('A', 'C', ['C', 'B', 'C'])).toBe(true)
  })

  it('exige estado válido y capacidad operativa para asignar tickets', () => {
    const support = {
      active: true,
      deletedAt: null,
      roles: [{ code: 'SUPPORT', permissions: ['tickets.view', 'tickets.update', 'tickets.assign'] }]
    }
    expect(isTicketAssignmentEligible(support)).toBe(true)
    expect(isTicketAssignmentEligible({ ...support, active: false })).toBe(false)
    expect(isTicketAssignmentEligible({ ...support, deletedAt: new Date() })).toBe(false)
    expect(
      isTicketAssignmentEligible({
        active: true,
        deletedAt: null,
        roles: [{ code: 'SALES', permissions: ['tickets.view', 'tickets.update'] }]
      })
    ).toBe(false)
    expect(
      isTicketAssignmentEligible({
        active: true,
        deletedAt: null,
        roles: [{ code: 'SUPER_ADMIN', permissions: [] }]
      })
    ).toBe(true)
  })
})
