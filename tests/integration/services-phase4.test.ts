import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import 'dotenv/config'

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip
let prisma: typeof import('../../server/utils/prisma').prisma
const suffix = Date.now().toString()
const ids: Record<string, string> = {}

describeWithDatabase('persistencia de servicios y tickets de Fase 4', () => {
  beforeAll(async () => {
    ;({ prisma } = await import('../../server/utils/prisma'))
    const category = await prisma.serviceCategory.create({
      data: { name: `Servicios ${suffix}`, slug: `servicios-${suffix}`, active: true }
    })
    const service = await prisma.service.create({
      data: {
        serviceCode: `IT-SRV-${suffix}`,
        name: 'Servicio integración',
        slug: `servicio-integracion-${suffix}`,
        categoryId: category.id,
        priceMode: 'FROM',
        price: '25.00',
        active: true,
        fields: {
          create: {
            key: 'equipo',
            label: 'Equipo original',
            type: 'SELECT',
            required: true,
            options: { create: { value: 'laptop', label: 'Laptop original' } }
          }
        }
      },
      include: { fields: { include: { options: true } } }
    })
    const customer = await prisma.customer.create({
      data: {
        customerCode: `IT-CLI-${suffix}`,
        firstName: 'Ana',
        lastName: 'Prueba',
        whatsapp: `+593${suffix.slice(-9)}`
      }
    })
    const field = service.fields[0]!
    const option = field.options[0]!
    const ticket = await prisma.ticket.create({
      data: {
        ticketCode: `IT-TCK-${suffix}`,
        requestId: crypto.randomUUID(),
        customerId: customer.id,
        serviceId: service.id,
        subject: 'Snapshot de integración',
        fieldValues: {
          create: {
            fieldId: field.id,
            fieldKey: field.key,
            fieldLabel: field.label,
            fieldType: field.type,
            options: { create: { optionId: option.id, optionValue: option.value, optionLabel: option.label } }
          }
        },
        history: { create: { action: 'TICKET_CREATED', toStatus: 'NEW', toPriority: 'NORMAL' } }
      }
    })
    Object.assign(ids, {
      category: category.id,
      service: service.id,
      customer: customer.id,
      field: field.id,
      option: option.id,
      ticket: ticket.id
    })
  })

  afterAll(async () => {
    if (!prisma) return
    if (ids.ticket) await prisma.ticket.delete({ where: { id: ids.ticket } })
    if (ids.customer) await prisma.customer.delete({ where: { id: ids.customer } })
    if (ids.service) await prisma.service.delete({ where: { id: ids.service } })
    if (ids.category) await prisma.serviceCategory.delete({ where: { id: ids.category } })
    await prisma.$disconnect()
  })

  it('mantiene snapshots aunque cambie el formulario publicado', async () => {
    await prisma.serviceFormField.update({ where: { id: ids.field }, data: { label: 'Equipo actualizado' } })
    await prisma.serviceFormFieldOption.update({
      where: { id: ids.option },
      data: { label: 'Laptop actualizada' }
    })
    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: ids.ticket },
      include: { fieldValues: { include: { options: true } }, history: true }
    })
    expect(ticket.fieldValues[0]?.fieldLabel).toBe('Equipo original')
    expect(ticket.fieldValues[0]?.options[0]?.optionLabel).toBe('Laptop original')
    expect(ticket.history[0]?.action).toBe('TICKET_CREATED')
  })

  it('impide precios incompatibles y requestId duplicado en PostgreSQL', async () => {
    await expect(
      prisma.service.update({ where: { id: ids.service }, data: { priceMode: 'QUOTE', price: '1.00' } })
    ).rejects.toThrow()
    const original = await prisma.ticket.findUniqueOrThrow({ where: { id: ids.ticket } })
    await expect(
      prisma.ticket.create({
        data: {
          ticketCode: `DUP-${suffix}`,
          requestId: original.requestId,
          customerId: ids.customer,
          serviceId: ids.service,
          subject: 'Duplicado'
        }
      })
    ).rejects.toThrow()
  })

  it('dispone de permisos, WhatsApp y secuencias comerciales de Fase 4', async () => {
    const [permissions, setting, sequences] = await Promise.all([
      prisma.permission.count({
        where: {
          code: {
            in: [
              'services.view',
              'serviceCategories.view',
              'tickets.view',
              'tickets.assign',
              'tickets.managePriority',
              'tickets.addMessage'
            ]
          }
        }
      }),
      prisma.setting.findUnique({ where: { key: 'business.whatsapp' } }),
      prisma.codeSequence.count({ where: { key: { in: ['service', 'customer', 'ticket'] } } })
    ])
    expect(permissions).toBe(6)
    expect(setting?.value).toBeTruthy()
    expect(sequences).toBe(3)
  })
})
