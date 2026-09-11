import { orderWhatsAppOpenedSchema } from '#shared/schemas/order.schema'
import { orderService } from '../../services/order.service'
import { enforcePublicAbuseRateLimit } from '../../utils/public-abuse-rate-limit'

export default defineEventHandler(async (event) => {
  enforcePublicAbuseRateLimit(event, 'handoff')
  const body = await parseValidatedBody(event, orderWhatsAppOpenedSchema)
  await orderService.markWhatsAppOpened(event, body.orderNumber, body.handoffToken)
  setResponseStatus(event, 204)
})
