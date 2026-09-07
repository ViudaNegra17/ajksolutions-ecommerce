import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { getRequestContext } from '../utils/request-context'

type AuditInput = {
  userId?: string
  action: string
  entity: string
  entityId?: string
  oldValues?: Prisma.InputJsonValue
  newValues?: Prisma.InputJsonValue
}

export const auditService = {
  async record(event: H3Event, input: AuditInput): Promise<void> {
    const context = getRequestContext(event)
    await prisma.auditLog.create({ data: { ...input, ...context } })
  },
  async recordWithClient(event: H3Event, client: Prisma.TransactionClient, input: AuditInput): Promise<void> {
    const context = getRequestContext(event)
    await client.auditLog.create({ data: { ...input, ...context } })
  }
}
