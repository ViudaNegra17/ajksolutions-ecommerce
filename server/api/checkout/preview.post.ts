import { checkoutPreviewSchema } from '#shared/schemas/checkout.schema'
import { orderService } from '../../services/order.service'
import { enforcePublicAbuseRateLimit } from '../../utils/public-abuse-rate-limit'

export default defineEventHandler(async (event) => {
  enforcePublicAbuseRateLimit(event, 'checkoutPreview')
  return {
    success: true,
    data: await orderService.preview(await parseValidatedBody(event, checkoutPreviewSchema))
  }
})
