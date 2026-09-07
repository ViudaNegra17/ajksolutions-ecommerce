import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import 'dotenv/config'
import { verifyHandoffToken } from '../../server/utils/handoff-token'

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma
let ticketService: typeof import('../../server/services/ticket.service').ticketService
let categoryService: typeof import('../../server/services/service-management.service').serviceCategoryManagementService

describeWithDatabase('hardening PostgreSQL de Fase 4.1', () => {
  const suffix = Date.now().toString()
  const ids = {
    category: '',
    service: '',
    actor: '',
    support: '',
    inactive: '',
    deleted: '',
    sales: ''
  }
  const event = {} as never

  function phone(group: number, index = 0) {
    return `09${group}${suffix.slice(-6)}${index}`.slice(0, 10)
  }

  function request(customer: {
    firstName?: string
    lastName?: string
    documentNumber?: string | null
    email?: string | null
    whatsapp: string
  }) {
    return {
      requestId: crypto.randomUUID(),
      serviceSlug: `hardening-4-1-${suffix}`,
      customer: {
        firstName: customer.firstName || 'Cliente',
        lastName: customer.lastName || 'Hardening',
        documentType: customer.documentNumber ? 'CEDULA' : null,
        documentNumber: customer.documentNumber || null,
        email: customer.email || null,
        phone: null,
        whatsapp: customer.whatsapp
      },
      description: null,
      answers: [],
      website: '',
      startedAt: Date.now() - 2000
    }
  }

  beforeAll(async () => {
    vi.stubGlobal('getRequestIP', () => '203.0.113.41')
    vi.stubGlobal('getHeader', () => undefined)
    ;({ prisma } = await import('../../server/utils/prisma'))
    ;({ ticketService } = await import('../../server/services/ticket.service'))
    ;({ serviceCategoryManagementService: categoryService } =
      await import('../../server/services/service-management.service'))

    const category = await prisma.serviceCategory.create({
      data: { name: `Hardening 4.1 ${suffix}`, slug: `hardening-4-1-${suffix}`, active: true }
    })
    const service = await prisma.service.create({
      data: {
        serviceCode: `H41-${suffix}`,
        name: 'Servicio hardening 4.1',
        slug: `hardening-4-1-${suffix}`,
        categoryId: category.id,
        priceMode: 'QUOTE',
        active: true
      }
    })
    const actor = await prisma.user.findFirstOrThrow({
      where: { active: true, deletedAt: null, roles: { some: { role: { code: 'SUPER_ADMIN' } } } }
    })
    const [supportRole, salesRole] = await Promise.all([
      prisma.role.findUniqueOrThrow({ where: { code: 'SUPPORT' } }),
      prisma.role.findUniqueOrThrow({ where: { code: 'SALES' } })
    ])
    const userData = (label: string, active = true, deletedAt: Date | null = null) => ({
      firstName: label,
      lastName: 'Fase 4.1',
      email: `${label.toLowerCase()}-${suffix}@example.test`,
      passwordHash: 'not-used-in-hardening-tests',
      active,
      deletedAt
    })
    const [support, inactive, deleted, sales] = await Promise.all([
      prisma.user.create({ data: userData('Support') }),
      prisma.user.create({ data: userData('Inactive', false) }),
      prisma.user.create({ data: userData('Deleted', true, new Date()) }),
      prisma.user.create({ data: userData('Sales') })
    ])
    await prisma.userRole.createMany({
      data: [
        { userId: support.id, roleId: supportRole.id },
        { userId: inactive.id, roleId: supportRole.id },
        { userId: deleted.id, roleId: supportRole.id },
        { userId: sales.id, roleId: salesRole.id }
      ]
    })
    Object.assign(ids, {
      category: category.id,
      service: service.id,
      actor: actor.id,
      support: support.id,
      inactive: inactive.id,
      deleted: deleted.id,
      sales: sales.id
    })
  })

  afterAll(async () => {
    if (!prisma) return
    const tickets = await prisma.ticket.findMany({
      where: { serviceId: ids.service },
      select: { id: true, customerId: true }
    })
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [...tickets.map(({ id }) => id), ids.category, ids.service] } }
    })
    await prisma.ticket.deleteMany({ where: { serviceId: ids.service } })
    await prisma.customer.deleteMany({
      where: { id: { in: tickets.map(({ customerId }) => customerId) } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [ids.support, ids.inactive, ids.deleted, ids.sales] } }
    })
    if (ids.service) await prisma.service.delete({ where: { id: ids.service } })
    if (ids.category) await prisma.serviceCategory.delete({ where: { id: ids.category } })
    vi.unstubAllGlobals()
    await prisma.$disconnect()
  })

  it('reutiliza un Customer bajo concurrencia por WhatsApp', async () => {
    const whatsapp = phone(1)
    const results = await Promise.all(
      Array.from({ length: 3 }, () => ticketService.create(event, request({ whatsapp })))
    )
    const tickets = await prisma.ticket.findMany({
      where: { ticketCode: { in: results.map(({ ticketCode }) => ticketCode) } }
    })
    expect(new Set(tickets.map(({ customerId }) => customerId)).size).toBe(1)
    expect(await prisma.customer.count({ where: { whatsapp: '+593' + whatsapp.slice(1) } })).toBe(1)
  })

  it('reutiliza un Customer bajo concurrencia por documento', async () => {
    const documentNumber = `DOC-${suffix}-41`
    const results = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        ticketService.create(event, request({ documentNumber, whatsapp: phone(2, index) }))
      )
    )
    const tickets = await prisma.ticket.findMany({
      where: { ticketCode: { in: results.map(({ ticketCode }) => ticketCode) } }
    })
    expect(new Set(tickets.map(({ customerId }) => customerId)).size).toBe(1)
    expect(await prisma.customer.count({ where: { documentNumber: `DOC${suffix}41` } })).toBe(1)
  })

  it('normaliza email y evita duplicados concurrentes', async () => {
    const email = `USER-${suffix}@MAIL.COM`
    const results = await Promise.all([
      ticketService.create(event, request({ email, whatsapp: phone(3, 1) })),
      ticketService.create(event, request({ email: email.toLowerCase(), whatsapp: phone(3, 2) }))
    ])
    const tickets = await prisma.ticket.findMany({
      where: { ticketCode: { in: results.map(({ ticketCode }) => ticketCode) } }
    })
    expect(new Set(tickets.map(({ customerId }) => customerId)).size).toBe(1)
    expect(await prisma.customer.count({ where: { email: email.toLowerCase() } })).toBe(1)
  })

  it('rechaza identificadores que apuntan a Customers diferentes', async () => {
    const first = await ticketService.create(
      event,
      request({ documentNumber: `A-${suffix}`, whatsapp: phone(4, 1) })
    )
    const second = await ticketService.create(
      event,
      request({ email: `b-${suffix}@example.test`, whatsapp: phone(4, 2) })
    )
    const before = await prisma.ticket.count({ where: { serviceId: ids.service } })
    await expect(
      ticketService.create(
        event,
        request({
          documentNumber: `A-${suffix}`,
          email: `B-${suffix}@EXAMPLE.TEST`,
          whatsapp: phone(4, 1)
        })
      )
    ).rejects.toMatchObject({ statusCode: 409, data: { error: { code: 'CUSTOMER_IDENTITY_CONFLICT' } } })
    expect(await prisma.ticket.count({ where: { serviceId: ids.service } })).toBe(before)
    expect(first.ticketCode).not.toBe(second.ticketCode)
  })

  it('autoriza el handoff con hash, conserva NEW y registra solo la primera apertura', async () => {
    const result = await ticketService.create(event, request({ whatsapp: phone(5) }))
    expect(result.handoffToken).toBeTruthy()
    const stored = await prisma.ticket.findUniqueOrThrow({ where: { ticketCode: result.ticketCode } })
    expect(stored.whatsappHandoffTokenHash).not.toBe(result.handoffToken)
    expect(verifyHandoffToken(result.handoffToken!, stored.whatsappHandoffTokenHash!)).toBe(true)
    expect(await ticketService.get(stored.id)).not.toHaveProperty('whatsappHandoffTokenHash')

    await ticketService.markWhatsAppOpened(event, result.ticketCode, result.handoffToken!)
    const firstOpen = await prisma.ticket.findUniqueOrThrow({ where: { id: stored.id } })
    await ticketService.markWhatsAppOpened(event, result.ticketCode, result.handoffToken!)
    const repeated = await prisma.ticket.findUniqueOrThrow({ where: { id: stored.id } })
    expect(firstOpen.whatsappOpenedAt).toEqual(repeated.whatsappOpenedAt)
    expect(repeated.status).toBe('NEW')
    expect(
      await prisma.auditLog.count({
        where: { entityId: stored.id, action: 'TICKET_WHATSAPP_OPENED' }
      })
    ).toBe(1)
  })

  it('rechaza token inválido y token perteneciente a otro TCK sin revelar existencia', async () => {
    const [ticketA, ticketB] = await Promise.all([
      ticketService.create(event, request({ whatsapp: phone(6, 1) })),
      ticketService.create(event, request({ whatsapp: phone(6, 2) }))
    ])
    await expect(
      ticketService.markWhatsAppOpened(event, ticketA.ticketCode, 'A'.repeat(43))
    ).rejects.toMatchObject({ statusCode: 404, data: { error: { code: 'TICKET_HANDOFF_INVALID' } } })
    await expect(
      ticketService.markWhatsAppOpened(event, ticketB.ticketCode, ticketA.handoffToken!)
    ).rejects.toMatchObject({ statusCode: 404, data: { error: { code: 'TICKET_HANDOFF_INVALID' } } })
  })

  it('conserva la protección contra ciclos indirectos de ServiceCategory', async () => {
    const created: string[] = []
    try {
      const a = await categoryService.create(event, ids.actor, {
        name: `Ciclo A ${suffix}`,
        slug: `h41-ciclo-a-${suffix}`,
        parentId: null,
        description: null,
        imageUrl: null,
        icon: null,
        active: true,
        sortOrder: 0
      })
      created.push(a.id)
      const b = await categoryService.create(event, ids.actor, {
        name: `Ciclo B ${suffix}`,
        slug: `h41-ciclo-b-${suffix}`,
        parentId: a.id,
        description: null,
        imageUrl: null,
        icon: null,
        active: true,
        sortOrder: 0
      })
      created.push(b.id)
      const c = await categoryService.create(event, ids.actor, {
        name: `Ciclo C ${suffix}`,
        slug: `h41-ciclo-c-${suffix}`,
        parentId: b.id,
        description: null,
        imageUrl: null,
        icon: null,
        active: true,
        sortOrder: 0
      })
      created.push(c.id)
      await expect(
        categoryService.update(event, ids.actor, a.id, {
          name: a.name,
          slug: a.slug,
          parentId: c.id,
          description: null,
          imageUrl: null,
          icon: null,
          active: true,
          sortOrder: 0
        })
      ).rejects.toMatchObject({ statusCode: 422, data: { error: { code: 'SERVICE_CATEGORY_CYCLE' } } })
    } finally {
      await prisma.auditLog.deleteMany({ where: { entityId: { in: created } } })
      for (const id of created.reverse()) await prisma.serviceCategory.deleteMany({ where: { id } })
    }
  })

  it('rechaza usuarios inactivos, eliminados o sin permiso y acepta SUPPORT', async () => {
    const created = await ticketService.create(event, request({ whatsapp: phone(7) }))
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketCode: created.ticketCode } })
    for (const userId of [ids.inactive, ids.deleted, ids.sales]) {
      await expect(ticketService.assign(event, ids.actor, ticket.id, userId)).rejects.toMatchObject({
        statusCode: 422,
        data: { error: { code: 'TICKET_ASSIGNMENT_USER_INVALID' } }
      })
    }
    await ticketService.assign(event, ids.actor, ticket.id, ids.support, 'Asignación válida')
    const assigned = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticket.id },
      include: { history: true }
    })
    expect(assigned.assignedUserId).toBe(ids.support)
    expect(
      assigned.history.some(
        ({ fromAssignedUserId, toAssignedUserId }) =>
          fromAssignedUserId === null && toAssignedUserId === ids.support
      )
    ).toBe(true)
  })
})
