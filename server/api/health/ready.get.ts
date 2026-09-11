import { prisma } from '../../utils/prisma'
import { probeReadiness } from '../../utils/health'

export default defineEventHandler(async (event) => {
  const result = await probeReadiness(() => prisma.$queryRaw`SELECT 1`)
  if (!result.ready) setResponseStatus(event, 503)
  return result.status
})
