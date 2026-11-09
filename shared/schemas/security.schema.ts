import { z } from 'zod'
import { ROLE_CODES } from '../constants/permissions'

export const securityUserUpdateSchema = z.strictObject({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().max(320).toLowerCase().pipe(z.email()),
  active: z.boolean(),
  roles: z
    .array(z.enum(ROLE_CODES))
    .min(1, 'Selecciona al menos un rol')
    .max(4)
    .refine((roles) => new Set(roles).size === roles.length, 'Los roles no pueden repetirse')
})
export const securityUserCreateSchema = securityUserUpdateSchema.extend({
  password: z.string().min(12, 'Usa al menos 12 caracteres').max(128)
})
export const securityUserQuerySchema = z.object({
  search: z.string().trim().max(120).default(''),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})
export const securityUserIdSchema = z.uuid()
export type SecurityUserCreate = z.infer<typeof securityUserCreateSchema>
export type SecurityUserUpdate = z.infer<typeof securityUserUpdateSchema>
export type SecurityUserQuery = z.infer<typeof securityUserQuerySchema>
