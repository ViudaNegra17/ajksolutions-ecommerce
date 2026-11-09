import type { RoleCode } from '../constants/permissions'

export type SecurityUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  active: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{ code: RoleCode; name: string }>
}
export type SecurityRole = {
  code: RoleCode
  name: string
  description: string | null
  permissions: Array<{ code: string; name: string }>
}
export type SecurityUserPage = {
  items: SecurityUser[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}
