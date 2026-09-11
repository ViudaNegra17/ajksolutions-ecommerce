import { writeOperationalLog } from '../utils/operational-log'
import { createRequestId } from '../utils/request-context'

export default defineEventHandler((event) => {
  const startedAt = performance.now()
  const requestId = createRequestId()
  event.context.requestId = requestId
  setHeader(event, 'X-Request-ID', requestId)

  if (process.env.NODE_ENV !== 'production') return
  event.node.res.once('finish', () => {
    const status = event.node.res.statusCode
    writeOperationalLog(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', {
      requestId,
      route: getRequestURL(event).pathname,
      method: event.method,
      status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100
    })
  })
})
