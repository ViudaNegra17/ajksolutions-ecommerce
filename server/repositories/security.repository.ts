import type { Prisma } from '@prisma/client'
import { ROLE_CODES, PERMISSIONS } from '#shared/constants/permissions'
import type { SecurityUserQuery } from '#shared/schemas/security.schema'
import { prisma } from '../utils/prisma'

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { code: true, name: true } } } }
} as const satisfies Prisma.UserSelect
const roleSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  permissions: { select: { permission: { select: { code: true, name: true } } } }
} as const satisfies Prisma.RoleSelect

export const securityRepository = {
  transaction<T>(operation: (client: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(operation)
  },
  lockAdministration(client: Prisma.TransactionClient) {
    // One existing role row serializes account mutations, including last-admin checks.
    return client.$queryRaw<Array<{ id: string }>>`SELECT id FROM roles WHERE code = 'SUPER_ADMIN' FOR UPDATE`
  },
  managerExists(client: Prisma.TransactionClient, id: string) {
    return client.user.count({
      where: {
        id,
        active: true,
        deletedAt: null,
        roles: {
          some: {
            role: {
              OR: [
                { code: 'SUPER_ADMIN' },
                { permissions: { some: { permission: { code: PERMISSIONS.SECURITY_MANAGE } } } }
              ]
            }
          }
        }
      }
    })
  },
  roles() {
    return prisma.role.findMany({
      where: { code: { in: [...ROLE_CODES] } },
      select: roleSelect,
      orderBy: { code: 'asc' }
    })
  },
  findRoles(client: Prisma.TransactionClient, codes: string[]) {
    return client.role.findMany({ where: { code: { in: codes } }, select: roleSelect })
  },
  async list(input: SecurityUserQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      OR: ['firstName', 'lastName', 'email'].map((field) => ({
        [field]: { contains: input.search, mode: 'insensitive' }
      }))
    }
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      prisma.user.count({ where })
    ])
    return { items, total }
  },
  find(client: Prisma.TransactionClient, id: string) {
    return client.user.findFirst({ where: { id, deletedAt: null }, select: userSelect })
  },
  emailExists(client: Prisma.TransactionClient, email: string, exceptId?: string) {
    return client.user.count({
      where: { email: { equals: email, mode: 'insensitive' }, id: exceptId ? { not: exceptId } : undefined }
    })
  },
  otherActiveSuperAdmins(client: Prisma.TransactionClient, id: string) {
    return client.user.count({
      where: {
        id: { not: id },
        active: true,
        deletedAt: null,
        roles: { some: { role: { code: 'SUPER_ADMIN' } } }
      }
    })
  },
  create(client: Prisma.TransactionClient, data: Prisma.UserCreateInput) {
    return client.user.create({ data, select: userSelect })
  },
  update(client: Prisma.TransactionClient, id: string, data: Prisma.UserUpdateInput) {
    return client.user.update({ where: { id }, data, select: userSelect })
  }
}
