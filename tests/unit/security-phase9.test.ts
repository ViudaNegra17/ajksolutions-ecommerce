import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  securityUserCreateSchema,
  securityUserUpdateSchema,
  securityUserQuerySchema,
  securityUserIdSchema
} from '../../shared/schemas/security.schema'
import { securityService } from '../../server/services/security.service'
import { securityRepository } from '../../server/repositories/security.repository'
import { auditService } from '../../server/services/audit.service'

vi.mock('argon2', () => ({ default: { argon2id: 2, hash: vi.fn(async () => 'encoded-password') } }))
vi.mock('../../server/services/audit.service', () => ({ auditService: { recordWithClient: vi.fn() } }))
vi.mock('../../server/repositories/security.repository', () => ({
  securityRepository: {
    transaction: vi.fn(),
    lockAdministration: vi.fn(),
    managerExists: vi.fn(),
    findRoles: vi.fn(),
    find: vi.fn(),
    otherActiveSuperAdmins: vi.fn(),
    emailExists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    roles: vi.fn(),
    list: vi.fn()
  }
}))
const repo = vi.mocked(securityRepository)
const superRole = {
  id: 'role-super',
  code: 'SUPER_ADMIN',
  name: 'Superadministrador',
  description: null,
  permissions: []
}
const salesRole = { ...superRole, id: 'role-sales', code: 'SALES', name: 'Ventas' }
const current = {
  id: '00000000-0000-4000-8000-000000000001',
  firstName: 'Admin',
  lastName: 'Prueba',
  email: 'admin@example.test',
  active: true,
  lastLoginAt: null,
  createdAt: new Date(),
  roles: [{ role: { code: 'SUPER_ADMIN', name: 'Superadministrador' } }]
}
const input = {
  firstName: current.firstName,
  lastName: current.lastName,
  email: current.email,
  active: true,
  roles: ['SUPER_ADMIN'] as const
}
const event = { context: { requestId: 'phase9-unit' } } as never

beforeEach(() => {
  vi.resetAllMocks()
  repo.transaction.mockImplementation(async (operation) => operation({} as never))
  repo.lockAdministration.mockResolvedValue([{ id: superRole.id }])
  repo.managerExists.mockResolvedValue(1)
  repo.find.mockResolvedValue(current)
  repo.findRoles.mockResolvedValue([superRole])
  repo.emailExists.mockResolvedValue(0)
  repo.otherActiveSuperAdmins.mockResolvedValue(0)
})
describe('Seguridad fase 9', () => {
  it('normaliza identidad y rechaza contraseñas cortas, permisos directos y roles inválidos o duplicados', () => {
    const valid = {
      ...input,
      roles: [...input.roles],
      email: ' ADMIN@EXAMPLE.TEST ',
      password: 'Clave-Inicial-Segura-2026'
    }
    expect(securityUserCreateSchema.parse(valid).email).toBe('admin@example.test')
    for (const invalid of [
      { ...valid, password: 'corta' },
      { ...valid, roles: [] },
      { ...valid, roles: ['OWNER'] },
      { ...valid, roles: ['SALES', 'SALES'] },
      { ...valid, permissions: ['security.manage'] },
      { ...valid, active: 'false' }
    ])
      expect(securityUserCreateSchema.safeParse(invalid).success).toBe(false)
    expect(securityUserUpdateSchema.safeParse({ ...input, password: 'Cambio-no-admitido' }).success).toBe(
      false
    )
  })
  it('valida UUID, paginación y búsqueda acotada', () => {
    expect(securityUserIdSchema.safeParse('invalid').success).toBe(false)
    expect(securityUserQuerySchema.safeParse({ page: -1 }).success).toBe(false)
    expect(securityUserQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false)
    expect(securityUserQuerySchema.safeParse({ search: 'x'.repeat(121) }).success).toBe(false)
  })
  it('impide que el administrador se desactive o pierda su propio acceso', async () => {
    await expect(
      securityService.update(event, current.id, current.id, {
        ...input,
        roles: ['SUPER_ADMIN'],
        active: false
      })
    ).rejects.toMatchObject({ statusCode: 409, data: { error: { code: 'SECURITY_SELF_LOCKOUT' } } })
    repo.findRoles.mockResolvedValue([salesRole])
    await expect(
      securityService.update(event, current.id, current.id, { ...input, roles: ['SALES'] })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repo.update).not.toHaveBeenCalled()
  })
  it('protege el último superadministrador activo al desactivar o retirar su rol', async () => {
    await expect(
      securityService.update(event, 'other-manager', current.id, {
        ...input,
        roles: ['SUPER_ADMIN'],
        active: false
      })
    ).rejects.toMatchObject({ statusCode: 409, data: { error: { code: 'SECURITY_LAST_SUPER_ADMIN' } } })
    repo.findRoles.mockResolvedValue([salesRole])
    await expect(
      securityService.update(event, 'other-manager', current.id, { ...input, roles: ['SALES'] })
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(repo.update).not.toHaveBeenCalled()
  })
  it('revalida al actor después de adquirir el bloqueo de administración', async () => {
    repo.managerExists.mockResolvedValue(0)
    await expect(
      securityService.update(event, 'revoked-manager', current.id, { ...input, roles: ['SUPER_ADMIN'] })
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(repo.lockAdministration.mock.invocationCallOrder[0]).toBeLessThan(
      repo.managerExists.mock.invocationCallOrder[0]!
    )
    expect(repo.find).not.toHaveBeenCalled()
  })
  it('serializa y audita únicamente datos seguros al crear una cuenta', async () => {
    const stored = { ...current, passwordHash: 'encoded-password' }
    repo.create.mockResolvedValue(stored)
    const created = await securityService.create(event, 'other-manager', {
      ...input,
      roles: ['SUPER_ADMIN'],
      password: 'Clave-Inicial-Segura-2026'
    })
    expect(created).not.toHaveProperty('passwordHash')
    expect(JSON.stringify(vi.mocked(auditService.recordWithClient).mock.calls)).not.toContain(
      'encoded-password'
    )
    expect(JSON.stringify(created)).not.toContain('Clave-Inicial')
    expect(auditService.recordWithClient).toHaveBeenCalledOnce()
  })
})
