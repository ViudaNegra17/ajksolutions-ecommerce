import 'dotenv/config'
import argon2 from 'argon2'
import type { H3Event } from 'h3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../server/utils/prisma'
import { securityService } from '../../server/services/security.service'
import { securityUserCreateSchema } from '../../shared/schemas/security.schema'
import { auditService } from '../../server/services/audit.service'
import { authService } from '../../server/services/auth.service'
import { apiError } from '../../server/utils/api-error'

const suffix = crypto.randomUUID()
const prefix = 'qa-security-' + suffix
const event = { context: { requestId: prefix } } as H3Event
let actorId = ''
let createdId = ''
const password = 'Clave-Inicial-Segura-2026'
const account = (name: string) =>
  securityUserCreateSchema.parse({
    firstName: 'QA',
    lastName: 'Seguridad',
    email: prefix + '-' + name + '@example.test',
    password,
    active: true,
    roles: ['SALES']
  })
describe.skipIf(!process.env.DATABASE_URL)('Seguridad transaccional con PostgreSQL', () => {
  beforeAll(async () => {
    vi.stubGlobal('apiError', apiError)
    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } })
    const actor = await prisma.user.create({
      data: {
        firstName: 'QA',
        lastName: 'Administrador',
        email: prefix + '-actor@example.test',
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        roles: { create: { roleId: role.id } }
      }
    })
    actorId = actor.id
  })
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { requestId: prefix } })
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } })
    await prisma.$disconnect()
    vi.unstubAllGlobals()
  })
  it('persiste Argon2id, roles y auditoría con una respuesta segura', async () => {
    const created = await securityService.create(event, actorId, account('first'))
    createdId = created.id
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: createdId } })
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/)
    expect(await argon2.verify(stored.passwordHash, password)).toBe(true)
    expect(created.roles.map((role) => role.code)).toEqual(['SALES'])
    expect(created).not.toHaveProperty('passwordHash')
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: createdId, action: 'security.user.created' }
    })
    expect(JSON.stringify(audit)).not.toContain(password)
    expect(JSON.stringify(audit)).not.toContain(stored.passwordHash)
    const list = await securityService.list({ page: 1, pageSize: 20, search: prefix })
    expect(list.items.some((user) => user.id === createdId)).toBe(true)
    expect(JSON.stringify(list)).not.toContain('passwordHash')
  })
  it('actualiza roles y revoca el acceso al desactivar la cuenta', async () => {
    const { password: omitted, ...update } = account('first')
    expect(omitted).toBe(password)
    const changed = await securityService.update(event, actorId, createdId, {
      ...update,
      roles: ['SUPPORT'],
      active: false
    })
    expect(changed.active).toBe(false)
    expect(changed.roles.map((role) => role.code)).toEqual(['SUPPORT'])
    expect(await authService.resolveActiveUser(createdId)).toBeNull()
    await securityService.update(event, actorId, createdId, { ...update, roles: ['SUPPORT'], active: true })
    expect((await authService.resolveActiveUser(createdId))?.roles).toEqual(['SUPPORT'])
  })
  it('revierte identidad y asignaciones si falla la escritura de auditoría', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: createdId }, include: { roles: true } })
    const spy = vi
      .spyOn(auditService, 'recordWithClient')
      .mockRejectedValueOnce(new Error('forced audit failure'))
    try {
      await expect(
        securityService.update(event, actorId, createdId, {
          firstName: 'Alterado',
          lastName: before.lastName,
          email: before.email,
          active: false,
          roles: ['ADMIN']
        })
      ).rejects.toThrow('forced audit failure')
    } finally {
      spy.mockRestore()
    }
    const after = await prisma.user.findUniqueOrThrow({ where: { id: createdId }, include: { roles: true } })
    expect(after.firstName).toBe(before.firstName)
    expect(after.active).toBe(before.active)
    expect(after.roles.map((role) => role.roleId)).toEqual(before.roles.map((role) => role.roleId))
  })
  it('rechaza al actor revocado y conserva sus propias protecciones', async () => {
    await expect(securityService.create(event, createdId, account('denied'))).rejects.toMatchObject({
      statusCode: 403
    })
    const actor = await prisma.user.findUniqueOrThrow({ where: { id: actorId } })
    await expect(
      securityService.update(event, actorId, actorId, {
        firstName: actor.firstName,
        lastName: actor.lastName,
        email: actor.email,
        roles: ['SUPER_ADMIN'],
        active: false
      })
    ).rejects.toMatchObject({ statusCode: 409 })
  })
  it('resuelve dos altas simultáneas con el mismo correo con una sola cuenta y auditoría', async () => {
    const result = await Promise.allSettled([
      securityService.create(event, actorId, account('concurrent')),
      securityService.create(event, actorId, account('concurrent'))
    ])
    expect(result.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    const rejected = result.find((item) => item.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason.statusCode).toBe(409)
    expect(await prisma.user.count({ where: { email: account('concurrent').email } })).toBe(1)
  })
})
