import argon2 from 'argon2'
import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { PERMISSIONS, type RoleCode } from '#shared/constants/permissions'
import type {
  SecurityUserCreate,
  SecurityUserUpdate,
  SecurityUserQuery
} from '#shared/schemas/security.schema'
import type { SecurityUser } from '#shared/types/security'
import { securityRepository } from '../repositories/security.repository'
import { auditService } from './audit.service'
import { apiError } from '../utils/api-error'
import { throwDatabaseError } from '../utils/domain-error'

type UserRow = NonNullable<Awaited<ReturnType<typeof securityRepository.find>>>
function serializeUser(row: UserRow): SecurityUser {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    active: row.active,
    lastLoginAt: row.lastLoginAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    roles: row.roles.map((link) => ({ code: link.role.code as RoleCode, name: link.role.name }))
  }
}
function auditValues(user: SecurityUser) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    active: user.active,
    roles: user.roles.map((role) => role.code)
  }
}
async function asManager<T>(actorId: string, operation: (client: Prisma.TransactionClient) => Promise<T>) {
  try {
    return await securityRepository.transaction(async (client) => {
      const locked = await securityRepository.lockAdministration(client)
      if (!locked.length)
        throw apiError(503, 'SECURITY_CONFIGURATION_MISSING', 'Configuración de seguridad incompleta.')
      if (!(await securityRepository.managerExists(client, actorId)))
        throw apiError(403, 'AUTH_FORBIDDEN', 'Tu cuenta ya no tiene acceso a Seguridad.')
      return operation(client)
    })
  } catch (error) {
    throwDatabaseError(error)
  }
}
async function resolveRoles(client: Prisma.TransactionClient, codes: string[]) {
  const roles = await securityRepository.findRoles(client, codes)
  if (roles.length !== codes.length)
    throw apiError(422, 'SECURITY_ROLE_NOT_FOUND', 'Uno de los roles no está disponible.')
  return roles
}

export const securityService = {
  async roles() {
    const roles = await securityRepository.roles()
    return roles.map((role) => ({
      code: role.code as RoleCode,
      name: role.name,
      description: role.description,
      permissions: role.permissions
        .map((link) => link.permission)
        .sort((a, b) => a.code.localeCompare(b.code))
    }))
  },
  async list(input: SecurityUserQuery) {
    const { items, total } = await securityRepository.list(input)
    return {
      items: items.map(serializeUser),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize)
      }
    }
  },
  async create(event: H3Event, actorId: string, input: SecurityUserCreate) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })
    return asManager(actorId, async (client) => {
      const roles = await resolveRoles(client, input.roles)
      if (await securityRepository.emailExists(client, input.email))
        throw apiError(409, 'SECURITY_EMAIL_CONFLICT', 'Ese correo ya está registrado.')
      const user = serializeUser(
        await securityRepository.create(client, {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          active: input.active,
          passwordHash,
          roles: { create: roles.map((role) => ({ roleId: role.id })) }
        })
      )
      await auditService.recordWithClient(event, client, {
        userId: actorId,
        action: 'security.user.created',
        entity: 'User',
        entityId: user.id,
        newValues: auditValues(user)
      })
      return user
    })
  },
  async update(event: H3Event, actorId: string, id: string, input: SecurityUserUpdate) {
    return asManager(actorId, async (client) => {
      const current = await securityRepository.find(client, id)
      if (!current) throw apiError(404, 'SECURITY_USER_NOT_FOUND', 'El usuario no existe.')
      const roles = await resolveRoles(client, input.roles)
      const retainsManagement = roles.some(
        (role) =>
          role.code === 'SUPER_ADMIN' ||
          role.permissions.some((link) => link.permission.code === PERMISSIONS.SECURITY_MANAGE)
      )
      if (actorId === id && (!input.active || !retainsManagement))
        throw apiError(
          409,
          'SECURITY_SELF_LOCKOUT',
          'Tu cuenta debe permanecer activa y conservar acceso a Seguridad.'
        )
      const removesSuperAdmin =
        current.active &&
        current.roles.some((link) => link.role.code === 'SUPER_ADMIN') &&
        (!input.active || !input.roles.includes('SUPER_ADMIN'))
      if (removesSuperAdmin && !(await securityRepository.otherActiveSuperAdmins(client, id)))
        throw apiError(
          409,
          'SECURITY_LAST_SUPER_ADMIN',
          'Debe existir al menos un superadministrador activo.'
        )
      if (await securityRepository.emailExists(client, input.email, id))
        throw apiError(409, 'SECURITY_EMAIL_CONFLICT', 'Ese correo ya está registrado.')
      const user = serializeUser(
        await securityRepository.update(client, id, {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          active: input.active,
          roles: { deleteMany: {}, create: roles.map((role) => ({ roleId: role.id })) }
        })
      )
      await auditService.recordWithClient(event, client, {
        userId: actorId,
        action: 'security.user.updated',
        entity: 'User',
        entityId: id,
        oldValues: auditValues(serializeUser(current)),
        newValues: auditValues(user)
      })
      return user
    })
  }
}
