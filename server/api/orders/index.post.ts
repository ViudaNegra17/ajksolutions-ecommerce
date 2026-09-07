import { createOrderSchema } from '#shared/schemas/checkout.schema'
import { orderService } from '../../services/order.service'
import { enforceOrderRateLimit } from '../../utils/order-rate-limit'

export default defineEventHandler(async (event) => {
  enforceOrderRateLimit(event)
  const data = await orderService.create(event, await parseValidatedBody(event, createOrderSchema))
  setResponseStatus(event, 201)
  return { success: true, data }
})
