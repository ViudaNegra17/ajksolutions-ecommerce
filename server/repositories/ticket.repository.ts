import type { Prisma, TicketHistoryAction, TicketPriority, TicketStatus } from '@prisma/client'
import { isTicketAssignmentEligible } from '#shared/utils/ticket-assignment'
import { prisma } from '../utils/prisma'

export const ticketRepository = {
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(callback, { isolationLevel: 'Serializable' })
  },
  findByRequestId(requestId: string) {
    return prisma.ticket.findUnique({
      where: { requestId },
      include: {
        customer: true,
        service: true,
        fieldValues: { include: { options: true }, orderBy: { createdAt: 'asc' } }
      }
    })
  },
  async list(input: {
    page: number
    pageSize: number
    search?: string
    status?: TicketStatus
    priority?: TicketPriority
    service?: string
    assignedUser?: string
    dateFrom?: Date
    dateTo?: Date
  }) {
    const where: Prisma.TicketWhereInput = {
      status: input.status,
      priority: input.priority,
      serviceId: input.service,
      assignedUserId: input.assignedUser,
      createdAt: input.dateFrom || input.dateTo ? { gte: input.dateFrom, lte: input.dateTo } : undefined,
      ...(input.search
        ? {
            OR: [
              { ticketCode: { contains: input.search, mode: 'insensitive' } },
              { subject: { contains: input.search, mode: 'insensitive' } },
              { customer: { firstName: { contains: input.search, mode: 'insensitive' } } },
              { customer: { lastName: { contains: input.search, mode: 'insensitive' } } }
            ]
          }
        : {})
    }
    const [items, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketCode: true,
          createdAt: true,
          subject: true,
          status: true,
          priority: true,
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
          assignedUser: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.ticket.count({ where })
    ])
    return {
      items,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize)
      }
    }
  },
  detail(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      omit: { whatsappHandoffTokenHash: true },
      include: {
        customer: true,
        service: { select: { id: true, serviceCode: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        fieldValues: { include: { options: true }, orderBy: { createdAt: 'asc' } },
        messages: {
          include: { authorUser: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' }
        },
        history: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  },
  async eligibleUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        active: true,
        deletedAt: true,
        roles: {
          select: {
            role: {
              select: {
                code: true,
                permissions: { select: { permission: { select: { code: true } } } }
              }
            }
          }
        }
      }
    })
    if (
      !user ||
      !isTicketAssignmentEligible({
        active: user.active,
        deletedAt: user.deletedAt,
        roles: user.roles.map(({ role }) => ({
          code: role.code,
          permissions: role.permissions.map(({ permission }) => permission.code)
        }))
      })
    )
      return null
    return { id: user.id, firstName: user.firstName, lastName: user.lastName }
  },
  eligibleUsers() {
    return prisma.user.findMany({
      where: {
        active: true,
        deletedAt: null,
        roles: {
          some: {
            role: {
              OR: [
                { code: 'SUPER_ADMIN' },
                { permissions: { some: { permission: { code: 'tickets.assign' } } } }
              ]
            }
          }
        }
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true }
    })
  },
  services() {
    return prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  },
  async updateWithHistory(
    id: string,
    userId: string,
    data: Prisma.TicketUpdateInput,
    history: {
      action: TicketHistoryAction
      fromStatus?: TicketStatus
      toStatus?: TicketStatus
      fromPriority?: TicketPriority
      toPriority?: TicketPriority
      fromAssignedUserId?: string | null
      toAssignedUserId?: string | null
      notes?: string | null
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({ where: { id }, data })
      await tx.ticketHistory.create({ data: { ticketId: id, userId, ...history } })
      return ticket
    })
  },
  addMessage(id: string, userId: string, message: string, internal: boolean) {
    return prisma.ticketMessage.create({
      data: { ticketId: id, authorUserId: userId, type: 'STAFF', message, internal }
    })
  },
  findWhatsAppHandoff(ticketCode: string) {
    return prisma.ticket.findUnique({
      where: { ticketCode },
      select: {
        id: true,
        status: true,
        whatsappHandoffTokenHash: true,
        whatsappOpenedAt: true
      }
    })
  },
  dashboardCounts() {
    return Promise.all([
      prisma.ticket.count({ where: { status: 'NEW' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: { in: ['WAITING_CUSTOMER', 'IN_REVIEW', 'QUOTED'] } } })
    ])
  }
}
