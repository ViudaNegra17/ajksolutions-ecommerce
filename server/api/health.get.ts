import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  } catch {
    throw apiError(503, 'DATABASE_UNAVAILABLE', 'El servicio no está disponible temporalmente.')
  }
})
