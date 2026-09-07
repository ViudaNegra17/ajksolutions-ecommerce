import { checkoutPreviewSchema } from '#shared/schemas/checkout.schema'
import { orderService } from '../../services/order.service'

export default defineEventHandler(async (event) => ({
  success: true,
  data: await orderService.preview(await parseValidatedBody(event, checkoutPreviewSchema))
}))
