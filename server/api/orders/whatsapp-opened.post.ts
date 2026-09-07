import { orderWhatsAppOpenedSchema } from '#shared/schemas/order.schema'
import { orderService } from '../../services/order.service'

export default defineEventHandler(async (event) => {
  const body = await parseValidatedBody(event, orderWhatsAppOpenedSchema)
  await orderService.markWhatsAppOpened(event, body.orderNumber, body.handoffToken)
  setResponseStatus(event, 204)
})
