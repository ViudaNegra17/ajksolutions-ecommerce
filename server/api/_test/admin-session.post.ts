import { z } from 'zod'
import {
  ADMIN_SESSION_ABSOLUTE_MS,
  ADMIN_SESSION_IDLE_MS,
  ADMIN_SESSION_TOUCH_THROTTLE_MS
} from '#shared/utils/admin-session'

const schema = z.object({ mode: z.enum(['idle-expired', 'absolute-expired']) })

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const session = await requireUserSession(event)
  const { mode } = schema.parse(await readBody(event))
  const now = Date.now()
  const loggedInAt = new Date(
    mode === 'absolute-expired' ? now - ADMIN_SESSION_ABSOLUTE_MS - 1000 : now - ADMIN_SESSION_IDLE_MS - 1000
  ).toISOString()
  const lastActivityAt = new Date(
    mode === 'absolute-expired' ? now - ADMIN_SESSION_TOUCH_THROTTLE_MS : now - ADMIN_SESSION_IDLE_MS - 1000
  ).toISOString()
  await replaceUserSession(event, {
    user: session.user,
    loggedInAt,
    lastActivityAt,
    lastValidatedAt: new Date(now).toISOString()
  })
  return { success: true, data: { configured: mode } }
})
