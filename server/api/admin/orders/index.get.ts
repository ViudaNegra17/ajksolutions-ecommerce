import { PERMISSIONS } from '#shared/constants/permissions'
import { orderListQuerySchema } from '#shared/schemas/order-admin.schema'
import { orderService } from '../../../services/order.service'

export default defineEventHandler(async (event) => {
  await requirePermission(event, PERMISSIONS.ORDERS_VIEW)
  return { success: true, data: await orderService.list(parseValidatedQuery(event, orderListQuerySchema)) }
})
