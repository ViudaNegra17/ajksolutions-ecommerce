import argon2 from 'argon2'
import type { LoginInput } from '#shared/schemas/auth.schema'
import type { SafeUser } from '#shared/schemas/user.schema'
import { userRepository } from '../repositories/user.repository'

type AuthUser = NonNullable<Awaited<ReturnType<typeof userRepository.findActiveByEmail>>>

function toSafeUser(user: AuthUser): SafeUser {
  const roles = user.roles.map((item) => item.role.code)
  const permissions = [
    ...new Set(user.roles.flatMap((item) => item.role.permissions.map((link) => link.permission.code)))
  ]

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    roles,
    permissions
  }
}

export const authService = {
  async authenticate(input: LoginInput): Promise<SafeUser | null> {
    const user = await userRepository.findActiveByEmail(input.email)

    if (!user) {
      await argon2.hash(input.password, { type: argon2.argon2id })
      return null
    }

    const valid = await argon2.verify(user.passwordHash, input.password)
    if (!valid) return null

    await userRepository.markLogin(user.id)
    return toSafeUser(user)
  },
  async resolveActiveUser(userId: string): Promise<SafeUser | null> {
    const user = await userRepository.findActiveById(userId)
    return user ? toSafeUser(user) : null
  }
}
