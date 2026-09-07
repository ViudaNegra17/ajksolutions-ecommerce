import type { H3Event } from 'h3'
import {
  Prisma,
  type ServiceFormField,
  type ServiceFormFieldOption,
  type TicketFieldValue,
  type TicketFieldValueOption
} from '@prisma/client'
import type { PublicTicketInput } from '#shared/schemas/ticket.schema'
import {
  buildWhatsAppUrl,
  canTransition,
  normalizeDocument,
  normalizeEmail,
  normalizePhone
} from '#shared/utils/tickets'
import { customerRepository } from '../repositories/customer.repository'
import { nextCommercialCode } from '../repositories/code.repository'
import { serviceRepository } from '../repositories/service.repository'
import { ticketRepository } from '../repositories/ticket.repository'
import { apiError } from '../utils/api-error'
import { createHandoffToken, verifyHandoffToken } from '../utils/handoff-token'
import { auditService } from './audit.service'

type Field = ServiceFormField & { options: ServiceFormFieldOption[] }
type Answer = PublicTicketInput['answers'][number]

function validateAnswers(fields: Field[], answers: Answer[]) {
  const definitions = new Map(fields.map((field) => [field.id, field]))
  const values = new Map<string, Answer>()
  for (const answer of answers) {
    if (values.has(answer.fieldId))
      throw apiError(422, 'TICKET_FIELD_DUPLICATE', 'Un campo fue enviado más de una vez.')
    if (!definitions.has(answer.fieldId))
      throw apiError(422, 'TICKET_FIELD_INVALID', 'Un campo no pertenece al servicio.')
    values.set(answer.fieldId, answer)
  }
  for (const field of fields) {
    const answer = values.get(field.id)
    if (
      field.required &&
      (answer == null || answer.value === '' || (Array.isArray(answer.value) && !answer.value.length))
    ) {
      throw apiError(422, 'TICKET_FIELD_REQUIRED', `El campo ${field.label} es obligatorio.`)
    }
    if (!answer) continue
    const config = (field.validationConfig || {}) as Record<string, number>
    const value = answer.value
    if (['TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'DATE'].includes(field.type) && typeof value !== 'string') {
      throw apiError(422, 'TICKET_FIELD_TYPE', `El valor de ${field.label} no es válido.`)
    }
    if (field.type === 'NUMBER' && typeof value !== 'number')
      throw apiError(422, 'TICKET_FIELD_TYPE', `${field.label} debe ser numérico.`)
    if (field.type === 'BOOLEAN' && typeof value !== 'boolean')
      throw apiError(422, 'TICKET_FIELD_TYPE', `${field.label} debe ser booleano.`)
    if (['SELECT', 'MULTISELECT'].includes(field.type) && !Array.isArray(value))
      throw apiError(422, 'TICKET_FIELD_TYPE', `${field.label} requiere opciones.`)
    if (field.type === 'SELECT' && Array.isArray(value) && value.length !== 1)
      throw apiError(422, 'TICKET_FIELD_TYPE', `${field.label} requiere una opción.`)
    if (typeof value === 'string') {
      if (config.minLength != null && value.trim().length < config.minLength)
        throw apiError(422, 'TICKET_FIELD_MIN_LENGTH', `${field.label} es demasiado corto.`)
      if (config.maxLength != null && value.length > config.maxLength)
        throw apiError(422, 'TICKET_FIELD_MAX_LENGTH', `${field.label} es demasiado largo.`)
      if (field.type === 'EMAIL' && !/^\S+@\S+\.\S+$/.test(value))
        throw apiError(422, 'TICKET_FIELD_EMAIL', `${field.label} no es un email válido.`)
      if (field.type === 'DATE' && !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw apiError(422, 'TICKET_FIELD_DATE', `${field.label} no es una fecha válida.`)
    }
    if (typeof value === 'number') {
      if (config.min != null && value < config.min)
        throw apiError(422, 'TICKET_FIELD_MIN', `${field.label} está bajo el mínimo.`)
      if (config.max != null && value > config.max)
        throw apiError(422, 'TICKET_FIELD_MAX', `${field.label} supera el máximo.`)
    }
    if (Array.isArray(value)) {
      const allowed = new Set(field.options.filter((option) => option.active).map((option) => option.id))
      if (new Set(value).size !== value.length || value.some((id) => !allowed.has(id))) {
        throw apiError(422, 'TICKET_OPTION_INVALID', `Una opción de ${field.label} no es válida.`)
      }
    }
  }
  return values
}

function fieldCreate(field: Field, answer: Answer): Prisma.TicketFieldValueCreateWithoutTicketInput {
  const base = {
    field: { connect: { id: field.id } },
    fieldKey: field.key,
    fieldLabel: field.label,
    fieldType: field.type
  }
  if (typeof answer.value === 'string') {
    if (field.type === 'DATE') return { ...base, dateValue: new Date(`${answer.value}T00:00:00.000Z`) }
    return { ...base, textValue: answer.value.trim() }
  }
  if (typeof answer.value === 'number') return { ...base, numberValue: answer.value }
  if (typeof answer.value === 'boolean') return { ...base, booleanValue: answer.value }
  const options = new Map(field.options.map((option) => [option.id, option]))
  return {
    ...base,
    options: {
      create: answer.value.map((id) => {
        const option = options.get(id)!
        return { option: { connect: { id } }, optionValue: option.value, optionLabel: option.label }
      })
    }
  }
}

type MessageTicket = {
  ticketCode: string
  customer: { firstName: string; lastName: string; whatsapp: string | null }
  service: { name: string }
  fieldValues: Array<TicketFieldValue & { options: TicketFieldValueOption[] }>
}

function displayValue(value: MessageTicket['fieldValues'][number]) {
  if (value.options.length) return value.options.map((option) => option.optionLabel).join(', ')
  if (value.textValue != null) return value.textValue
  if (value.numberValue != null) return value.numberValue.toString()
  if (value.booleanValue != null) return value.booleanValue ? 'Sí' : 'No'
  if (value.dateValue != null) return value.dateValue.toISOString().slice(0, 10)
  return '—'
}

function whatsappMessage(ticket: MessageTicket) {
  const answers = ticket.fieldValues.map((value) => `${value.fieldLabel}: ${displayValue(value)}`).join('\n')
  return [
    '*Nueva solicitud de servicio*',
    '',
    `Ticket: ${ticket.ticketCode}`,
    `Cliente: ${ticket.customer.firstName} ${ticket.customer.lastName}`,
    `WhatsApp: ${ticket.customer.whatsapp || 'No indicado'}`,
    '',
    'Servicio:',
    ticket.service.name,
    ...(answers ? ['', 'Datos:', answers] : []),
    '',
    'Deseo continuar con la atención de este servicio.'
  ].join('\n')
}

async function businessWhatsApp() {
  const rows = await serviceRepository.settings(['business.whatsapp'])
  const value = rows[0]?.value
  if (typeof value !== 'string' || !value.trim())
    throw apiError(503, 'WHATSAPP_NOT_CONFIGURED', 'WhatsApp comercial no está configurado.')
  return value
}

function prismaConflictTarget(error: Prisma.PrismaClientKnownRequestError) {
  return JSON.stringify(error.meta || {}).toLowerCase()
}

export function isRetryableCustomerRace(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code === 'P2034') return true
  if (error.code !== 'P2002') return false
  const target = prismaConflictTarget(error)
  return (
    target.includes('customer') ||
    target.includes('customers_') ||
    target.includes('documentnumber') ||
    target.includes('whatsapp') ||
    target.includes('email')
  )
}

function isRequestIdConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    prismaConflictTarget(error).includes('requestid')
  )
}

export async function retryCustomerTransaction<T>(operation: () => Promise<T>, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableCustomerRace(error)) throw error
      if (attempt === attempts) {
        throw apiError(
          409,
          'CUSTOMER_IDENTITY_CONFLICT',
          'No fue posible resolver la identidad del cliente de forma segura.'
        )
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 10))
    }
  }
  throw new Error('Unreachable customer retry state')
}

export const ticketService = {
  async create(event: H3Event, input: PublicTicketInput) {
    if (input.website) throw apiError(422, 'SPAM_REJECTED', 'Solicitud inválida.')
    if (Date.now() - input.startedAt < 1200)
      throw apiError(422, 'FORM_TOO_FAST', 'Completa el formulario antes de enviarlo.')
    const duplicate = await ticketRepository.findByRequestId(input.requestId)
    if (duplicate) {
      return {
        ticketCode: duplicate.ticketCode,
        status: duplicate.status,
        whatsappUrl: buildWhatsAppUrl(await businessWhatsApp(), whatsappMessage(duplicate)),
        handoffToken: null
      }
    }
    const service = await serviceRepository.findPublicBySlug(input.serviceSlug)
    if (!service) throw apiError(404, 'SERVICE_NOT_FOUND', 'El servicio no existe o no está publicado.')
    const answers = validateAnswers(service.fields, input.answers)
    const normalizedCustomer = {
      ...input.customer,
      documentNumber: normalizeDocument(input.customer.documentNumber),
      email: normalizeEmail(input.customer.email),
      phone: normalizePhone(input.customer.phone),
      whatsapp: normalizePhone(input.customer.whatsapp)
    }
    if (!normalizedCustomer.whatsapp) throw apiError(422, 'WHATSAPP_INVALID', 'El WhatsApp no es válido.')
    const handoff = createHandoffToken()
    let responseHandoffToken: string | null = handoff.token
    let created: Awaited<ReturnType<typeof ticketRepository.findByRequestId>>
    try {
      created = await retryCustomerTransaction(() =>
        ticketRepository.transaction(async (tx) => {
          const customer = await customerRepository.findOrCreate(tx, {
            ...normalizedCustomer,
            whatsapp: normalizedCustomer.whatsapp!
          })
          const ticketCode = await nextCommercialCode(tx, 'ticket')
          const ticket = await tx.ticket.create({
            data: {
              ticketCode,
              requestId: input.requestId,
              customerId: customer.id,
              serviceId: service.id,
              subject: `${service.name} — ${customer.firstName} ${customer.lastName}`.slice(0, 255),
              description: input.description || null,
              status: 'NEW',
              priority: 'NORMAL',
              source: 'WEB',
              whatsappHandoffTokenHash: handoff.hash,
              fieldValues: {
                create: service.fields.flatMap((field) => {
                  const answer = answers.get(field.id)
                  return answer ? [fieldCreate(field, answer)] : []
                })
              },
              history: { create: { action: 'TICKET_CREATED', toStatus: 'NEW', toPriority: 'NORMAL' } }
            },
            include: {
              customer: true,
              service: true,
              fieldValues: { include: { options: true }, orderBy: { createdAt: 'asc' } }
            }
          })
          await auditService.recordWithClient(event, tx, {
            action: 'TICKET_CREATED',
            entity: 'Ticket',
            entityId: ticket.id,
            newValues: { ticketCode, serviceCode: service.serviceCode, source: 'WEB' }
          })
          return ticket
        })
      )
    } catch (error) {
      if (!isRequestIdConflict(error)) throw error
      created = await ticketRepository.findByRequestId(input.requestId)
      responseHandoffToken = null
    }
    if (!created) throw apiError(409, 'TICKET_IDEMPOTENCY_CONFLICT', 'La solicitud ya está siendo procesada.')
    return {
      ticketCode: created.ticketCode,
      status: created.status,
      whatsappUrl: buildWhatsAppUrl(await businessWhatsApp(), whatsappMessage(created)),
      handoffToken: responseHandoffToken
    }
  },
  async markWhatsAppOpened(event: H3Event, ticketCode: string, handoffToken: string) {
    const handoff = await ticketRepository.findWhatsAppHandoff(ticketCode)
    if (
      !handoff ||
      handoff.status === 'CANCELLED' ||
      !handoff.whatsappHandoffTokenHash ||
      !verifyHandoffToken(handoffToken, handoff.whatsappHandoffTokenHash)
    ) {
      throw apiError(404, 'TICKET_HANDOFF_INVALID', 'No se pudo autorizar el handoff de WhatsApp.')
    }
    if (handoff.whatsappOpenedAt) return
    await ticketRepository.transaction(async (tx) => {
      const openedAt = new Date()
      const updated = await tx.ticket.updateMany({
        where: {
          id: handoff.id,
          status: { not: 'CANCELLED' },
          whatsappHandoffTokenHash: handoff.whatsappHandoffTokenHash,
          whatsappOpenedAt: null
        },
        data: { whatsappOpenedAt: openedAt }
      })
      if (!updated.count) {
        const current = await tx.ticket.findUnique({
          where: { id: handoff.id },
          select: { status: true, whatsappHandoffTokenHash: true, whatsappOpenedAt: true }
        })
        if (
          current?.status !== 'CANCELLED' &&
          current?.whatsappOpenedAt &&
          current.whatsappHandoffTokenHash === handoff.whatsappHandoffTokenHash
        )
          return
        throw apiError(404, 'TICKET_HANDOFF_INVALID', 'No se pudo autorizar el handoff de WhatsApp.')
      }
      await auditService.recordWithClient(event, tx, {
        action: 'TICKET_WHATSAPP_OPENED',
        entity: 'Ticket',
        entityId: handoff.id,
        newValues: { whatsappOpenedAt: openedAt.toISOString() }
      })
    })
  },
  async list(input: Parameters<typeof ticketRepository.list>[0]) {
    const result = await ticketRepository.list(input)
    return {
      ...result,
      items: result.items.map((item) => ({
        id: item.id,
        ticketCode: item.ticketCode,
        createdAt: item.createdAt.toISOString(),
        customer: `${item.customer.firstName} ${item.customer.lastName}`,
        service: item.service.name,
        subject: item.subject,
        status: item.status,
        priority: item.priority,
        assignedTo: item.assignedUser ? `${item.assignedUser.firstName} ${item.assignedUser.lastName}` : null
      }))
    }
  },
  async get(id: string) {
    const item = await ticketRepository.detail(id)
    if (!item) throw apiError(404, 'TICKET_NOT_FOUND', 'El ticket no existe.')
    return item
  },
  async changeStatus(
    event: H3Event,
    userId: string,
    id: string,
    status: Parameters<typeof canTransition>[1],
    notes?: string | null
  ) {
    const old = await this.get(id)
    if (!canTransition(old.status, status))
      throw apiError(422, 'TICKET_TRANSITION_INVALID', 'La transición de estado no está permitida.')
    const closedAt = ['DELIVERED', 'CANCELLED'].includes(status) ? new Date() : null
    const item = await ticketRepository.updateWithHistory(
      id,
      userId,
      { status, closedAt },
      { action: 'STATUS_CHANGED', fromStatus: old.status, toStatus: status, notes }
    )
    await auditService.record(event, {
      userId,
      action: 'TICKET_STATUS_CHANGED',
      entity: 'Ticket',
      entityId: id,
      oldValues: { status: old.status },
      newValues: { status }
    })
    return item
  },
  async changePriority(
    event: H3Event,
    userId: string,
    id: string,
    priority: Parameters<typeof ticketRepository.updateWithHistory>[3]['toPriority'],
    notes?: string | null
  ) {
    if (!priority) throw apiError(422, 'TICKET_PRIORITY_INVALID', 'La prioridad no es válida.')
    const old = await this.get(id)
    const item = await ticketRepository.updateWithHistory(
      id,
      userId,
      { priority },
      { action: 'PRIORITY_CHANGED', fromPriority: old.priority, toPriority: priority, notes }
    )
    await auditService.record(event, {
      userId,
      action: 'TICKET_PRIORITY_CHANGED',
      entity: 'Ticket',
      entityId: id,
      oldValues: { priority: old.priority },
      newValues: { priority }
    })
    return item
  },
  async assign(
    event: H3Event,
    userId: string,
    id: string,
    assignedUserId?: string | null,
    notes?: string | null
  ) {
    const old = await this.get(id)
    if (assignedUserId && !(await ticketRepository.eligibleUser(assignedUserId)))
      throw apiError(422, 'TICKET_ASSIGNMENT_USER_INVALID', 'El usuario no puede recibir tickets.')
    const action = assignedUserId ? 'ASSIGNED' : 'UNASSIGNED'
    const item = await ticketRepository.updateWithHistory(
      id,
      userId,
      {
        assignedUser: assignedUserId ? { connect: { id: assignedUserId } } : { disconnect: true },
        ...(old.status === 'NEW' && assignedUserId ? { status: 'ASSIGNED' } : {})
      },
      {
        action,
        fromAssignedUserId: old.assignedUserId,
        toAssignedUserId: assignedUserId,
        fromStatus: old.status,
        toStatus: old.status === 'NEW' && assignedUserId ? 'ASSIGNED' : old.status,
        notes
      }
    )
    await auditService.record(event, {
      userId,
      action: 'TICKET_ASSIGNED',
      entity: 'Ticket',
      entityId: id,
      oldValues: { assignedUserId: old.assignedUserId },
      newValues: { assignedUserId: assignedUserId || null }
    })
    return item
  },
  async addMessage(event: H3Event, userId: string, id: string, message: string, internal: boolean) {
    await this.get(id)
    const item = await ticketRepository.addMessage(id, userId, message, internal)
    await auditService.record(event, {
      userId,
      action: 'TICKET_MESSAGE_ADDED',
      entity: 'Ticket',
      entityId: id,
      newValues: { messageId: item.id, internal }
    })
    return item
  },
  eligibleUsers: ticketRepository.eligibleUsers,
  serviceOptions: ticketRepository.services
}
