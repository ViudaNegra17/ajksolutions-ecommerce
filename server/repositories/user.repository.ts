import { prisma } from '../utils/prisma'

const authUserInclude = {
  roles: {
    include: {
      role: {
        include: { permissions: { include: { permission: true } } }
      }
    }
  }
} as const

export const userRepository = {
  findActiveByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, active: true, deletedAt: null },
      include: authUserInclude
    })
  },
  findActiveById(id: string) {
    return prisma.user.findFirst({
      where: { id, active: true, deletedAt: null },
      include: authUserInclude
    })
  },
  markLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
  }
}
