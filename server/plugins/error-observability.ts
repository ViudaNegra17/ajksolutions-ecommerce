import { safeErrorDetails, writeOperationalLog } from '../utils/operational-log'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('error', (error, context) => {
    const event = context.event
    writeOperationalLog('error', {
      requestId: event?.context.requestId,
      route: event ? getRequestURL(event).pathname : undefined,
      method: event?.method,
      ...safeErrorDetails(error)
    })
  })
})
